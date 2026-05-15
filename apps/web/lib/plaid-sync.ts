import { Prisma, SyncStatus, SyncTrigger } from "@prisma/client";
import type {
  AccountBase,
  Holding,
  RemovedTransaction,
  Security,
  Transaction
} from "plaid";
import { encryptSecret, decryptSecret } from "./crypto";
import { prisma } from "./db";
import { env } from "./env";
import { defaultPlaidCountryCodes, getPlaidClient, getPlaidProducts } from "./plaid-client";

const RETIREMENT_SUBTYPE_KEYWORDS = ["401", "ira", "retirement", "pension"];

const PRODUCT_NOT_READY_CODES = new Set([
  "PRODUCT_NOT_READY",
  "NO_LIABILITY_ACCOUNTS",
  "NO_INVESTMENT_ACCOUNTS"
]);

function asDecimal(value: number | string | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }
  return new Prisma.Decimal(value);
}

function mapPlaidTypeToAssetClass(account: AccountBase): string {
  const type = account.type?.toLowerCase();
  const subtype = account.subtype?.toLowerCase() ?? "";

  if (type === "credit" || type === "loan") {
    return "liability";
  }

  if (type === "investment") {
    if (RETIREMENT_SUBTYPE_KEYWORDS.some((keyword) => subtype.includes(keyword))) {
      return "retirement";
    }
    return "equity";
  }

  if (type === "depository") {
    return "cash";
  }

  return "alternative";
}

function mapPlaidTypeToSupport(account: AccountBase): {
  isSupported: boolean;
  reason: string | null;
} {
  const supportedTypes = new Set(["depository", "credit", "loan", "investment"]);
  if (supportedTypes.has(account.type)) {
    return { isSupported: true, reason: null };
  }

  return {
    isSupported: false,
    reason: `Unsupported Plaid account type: ${account.type}`
  };
}

function parseTransactionDate(dateLike: string | null | undefined): Date | null {
  if (!dateLike) {
    return null;
  }
  return new Date(`${dateLike}T00:00:00.000Z`);
}

function marketValueFromHolding(holding: Holding): number {
  if (holding.institution_value !== null) {
    return holding.institution_value ?? 0;
  }
  const quantity = holding.quantity ?? 0;
  const price = holding.institution_price ?? 0;
  return quantity * price;
}

export async function createPlaidLinkTokenForUser(userId: string) {
  const plaid = getPlaidClient();

  const response = await plaid.linkTokenCreate({
    user: {
      client_user_id: userId
    },
    client_name: "Net Worth Tracker",
    products: getPlaidProducts(),
    country_codes: defaultPlaidCountryCodes(),
    language: "en",
    webhook: env.PLAID_WEBHOOK_URL || undefined,
    redirect_uri: env.PLAID_REDIRECT_URI || undefined
  });

  return response.data.link_token;
}

async function upsertAccountsForItem(
  userId: string,
  itemId: string,
  institutionName: string | null | undefined,
  plaidAccounts: AccountBase[]
) {
  const seenPlaidAccountIds = new Set<string>();

  for (const account of plaidAccounts) {
    seenPlaidAccountIds.add(account.account_id);
    const support = mapPlaidTypeToSupport(account);

    await prisma.plaidAccount.upsert({
      where: {
        userId_plaidAccountId: {
          userId,
          plaidAccountId: account.account_id
        }
      },
      update: {
        itemId,
        name: account.name,
        officialName: account.official_name ?? null,
        institutionName: institutionName ?? null,
        mask: account.mask ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        assetClass: mapPlaidTypeToAssetClass(account),
        isSupported: support.isSupported,
        unsupportedReason: support.reason,
        currentBalance: asDecimal(account.balances.current),
        availableBalance: asDecimal(account.balances.available),
        isoCurrencyCode: account.balances.iso_currency_code ?? null,
        lastSyncedAt: new Date()
      },
      create: {
        userId,
        itemId,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name ?? null,
        institutionName: institutionName ?? null,
        mask: account.mask ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        assetClass: mapPlaidTypeToAssetClass(account),
        isSupported: support.isSupported,
        unsupportedReason: support.reason,
        currentBalance: asDecimal(account.balances.current),
        availableBalance: asDecimal(account.balances.available),
        isoCurrencyCode: account.balances.iso_currency_code ?? null,
        lastSyncedAt: new Date()
      }
    });
  }

  await prisma.plaidAccount.deleteMany({
    where: {
      userId,
      itemId,
      plaidAccountId: {
        notIn: [...seenPlaidAccountIds]
      }
    }
  });
}

async function syncInvestmentsHoldingsForItem(
  userId: string,
  itemId: string,
  accessToken: string
) {
  const plaid = getPlaidClient();
  try {
    const response = await plaid.investmentsHoldingsGet({
      access_token: accessToken
    });

    const accounts = await prisma.plaidAccount.findMany({
      where: { userId, itemId },
      select: {
        id: true,
        plaidAccountId: true,
        assetClass: true
      }
    });
    const accountByPlaidId = new Map(
      accounts.map((account) => [account.plaidAccountId, account])
    );

    const securityById = new Map<string, Security>();
    for (const security of response.data.securities) {
      securityById.set(security.security_id, security);
    }

    await prisma.plaidHolding.deleteMany({
      where: {
        userId,
        account: {
          itemId
        }
      }
    });

    const holdingsData = response.data.holdings
      .map((holding) => {
        const account = accountByPlaidId.get(holding.account_id);
        if (!account) {
          return null;
        }

        const security = securityById.get(holding.security_id);
        return {
          userId,
          accountId: account.id,
          securityId: holding.security_id,
          symbol: security?.ticker_symbol ?? null,
          name: security?.name ?? holding.security_id,
          quantity: asDecimal(holding.quantity),
          price: asDecimal(holding.institution_price),
          marketValue: asDecimal(marketValueFromHolding(holding)) ?? new Prisma.Decimal(0),
          costBasis: asDecimal(holding.cost_basis),
          dayChangePct: null,
          assetClass: account.assetClass,
          isoCurrencyCode: holding.iso_currency_code ?? null
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    if (holdingsData.length > 0) {
      await prisma.plaidHolding.createMany({
        data: holdingsData
      });
    }
  } catch (error) {
    const plaidError = error as { response?: { data?: { error_code?: string } } };
    const errorCode = plaidError.response?.data?.error_code;
    if (errorCode && PRODUCT_NOT_READY_CODES.has(errorCode)) {
      return;
    }
    throw error;
  }
}

async function upsertTransactions(
  userId: string,
  accountIdByPlaidId: Map<string, string>,
  transactions: Transaction[]
) {
  for (const transaction of transactions) {
    const accountId = accountIdByPlaidId.get(transaction.account_id);
    if (!accountId) {
      continue;
    }

    await prisma.plaidTransaction.upsert({
      where: {
        plaidTransactionId: transaction.transaction_id
      },
      update: {
        accountId,
        amount: asDecimal(transaction.amount) ?? new Prisma.Decimal(0),
        isoCurrencyCode: transaction.iso_currency_code ?? null,
        date: parseTransactionDate(transaction.date) ?? new Date(),
        authorizedDate: parseTransactionDate(transaction.authorized_date),
        name: transaction.name,
        merchantName: transaction.merchant_name ?? null,
        category:
          (transaction.personal_finance_category ?? transaction.category ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        pending: transaction.pending,
        paymentChannel: transaction.payment_channel
      },
      create: {
        userId,
        accountId,
        plaidTransactionId: transaction.transaction_id,
        amount: asDecimal(transaction.amount) ?? new Prisma.Decimal(0),
        isoCurrencyCode: transaction.iso_currency_code ?? null,
        date: parseTransactionDate(transaction.date) ?? new Date(),
        authorizedDate: parseTransactionDate(transaction.authorized_date),
        name: transaction.name,
        merchantName: transaction.merchant_name ?? null,
        category:
          (transaction.personal_finance_category ?? transaction.category ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        pending: transaction.pending,
        paymentChannel: transaction.payment_channel
      }
    });
  }
}

async function syncTransactionsForItem(
  userId: string,
  itemId: string,
  accessToken: string,
  existingCursor: string | null
) {
  const plaid = getPlaidClient();
  let cursor = existingCursor ?? undefined;
  let hasMore = true;

  const allAdded: Transaction[] = [];
  const allModified: Transaction[] = [];
  const allRemoved: RemovedTransaction[] = [];

  while (hasMore) {
    const response = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 200
    });

    cursor = response.data.next_cursor;
    hasMore = response.data.has_more;
    allAdded.push(...response.data.added);
    allModified.push(...response.data.modified);
    allRemoved.push(...response.data.removed);
  }

  const accounts = await prisma.plaidAccount.findMany({
    where: {
      userId,
      itemId
    },
    select: {
      id: true,
      plaidAccountId: true
    }
  });
  const accountIdByPlaidId = new Map(accounts.map((account) => [account.plaidAccountId, account.id]));

  await upsertTransactions(userId, accountIdByPlaidId, [...allAdded, ...allModified]);

  if (allRemoved.length > 0) {
    await prisma.plaidTransaction.deleteMany({
      where: {
        plaidTransactionId: {
          in: allRemoved.map((removed) => removed.transaction_id)
        }
      }
    });
  }

  return cursor ?? null;
}

async function createNetWorthSnapshot(userId: string, trigger: SyncTrigger) {
  const accounts = await prisma.plaidAccount.findMany({
    where: { userId },
    include: {
      holdings: true
    }
  });

  const byAssetClass: Record<string, number> = {
    cash: 0,
    equity: 0,
    retirement: 0,
    alternative: 0,
    hard_asset: 0,
    liability: 0
  };
  const byAccount: Record<string, number> = {};

  for (const account of accounts) {
    const holdingsTotal = account.holdings.reduce(
      (sum, holding) => sum + Number(holding.marketValue),
      0
    );
    const accountValue =
      account.holdings.length > 0 ? holdingsTotal : Number(account.currentBalance ?? 0);

    const signedValue = account.assetClass === "liability" ? -accountValue : accountValue;
    byAccount[account.plaidAccountId] = Number(signedValue.toFixed(2));

    const classKey = account.assetClass in byAssetClass ? account.assetClass : "alternative";
    byAssetClass[classKey] = Number((byAssetClass[classKey] + Math.abs(accountValue)).toFixed(2));
  }

  const totalAssets =
    byAssetClass.cash +
    byAssetClass.equity +
    byAssetClass.retirement +
    byAssetClass.alternative +
    byAssetClass.hard_asset;
  const totalLiabilities = byAssetClass.liability;
  const netWorth = totalAssets - totalLiabilities;

  await prisma.netWorthSnapshot.create({
    data: {
      userId,
      trigger,
      totalAssets: new Prisma.Decimal(totalAssets.toFixed(2)),
      totalLiabilities: new Prisma.Decimal(totalLiabilities.toFixed(2)),
      netWorth: new Prisma.Decimal(netWorth.toFixed(2)),
      byAssetClass,
      byAccount
    }
  });
}

export async function syncPlaidItem(itemId: string, trigger: SyncTrigger) {
  const item = await prisma.plaidItem.findUnique({
    where: { id: itemId }
  });
  if (!item) {
    throw new Error(`Plaid item ${itemId} was not found.`);
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      itemId,
      userId: item.userId,
      trigger,
      status: SyncStatus.STARTED
    }
  });

  try {
    const plaid = getPlaidClient();
    const accessToken = decryptSecret(item.encryptedAccessToken);
    const accountsResponse = await plaid.accountsGet({
      access_token: accessToken
    });

    await upsertAccountsForItem(
      item.userId,
      item.id,
      item.institutionName,
      accountsResponse.data.accounts
    );

    let nextCursor = item.transactionsCursor;
    try {
      nextCursor = await syncTransactionsForItem(
        item.userId,
        item.id,
        accessToken,
        item.transactionsCursor
      );
    } catch (error) {
      const plaidError = error as { response?: { data?: { error_code?: string } } };
      const errorCode = plaidError.response?.data?.error_code;
      if (!errorCode || !PRODUCT_NOT_READY_CODES.has(errorCode)) {
        throw error;
      }
    }

    await syncInvestmentsHoldingsForItem(item.userId, item.id, accessToken);
    await createNetWorthSnapshot(item.userId, trigger);

    await prisma.plaidItem.update({
      where: { id: item.id },
      data: {
        status: "ACTIVE",
        transactionsCursor: nextCursor,
        lastSyncedAt: new Date()
      }
    });

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.SUCCESS,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.ERROR,
        message: error instanceof Error ? error.message : "Unknown sync failure",
        finishedAt: new Date()
      }
    });

    throw error;
  }
}

export async function exchangePublicTokenAndSync(userId: string, publicToken: string) {
  const plaid = getPlaidClient();
  const exchangeResponse = await plaid.itemPublicTokenExchange({
    public_token: publicToken
  });

  const accessToken = exchangeResponse.data.access_token;
  const plaidItemId = exchangeResponse.data.item_id;
  const itemResponse = await plaid.itemGet({
    access_token: accessToken
  });

  const institutionId = itemResponse.data.item.institution_id ?? null;
  let institutionName: string | null = null;
  if (institutionId) {
    try {
      const institutionResponse = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: defaultPlaidCountryCodes()
      });
      institutionName = institutionResponse.data.institution.name;
    } catch {
      institutionName = null;
    }
  }

  const item = await prisma.plaidItem.upsert({
    where: {
      plaidItemId
    },
    update: {
      userId,
      encryptedAccessToken: encryptSecret(accessToken),
      institutionId,
      institutionName,
      status: "ACTIVE"
    },
    create: {
      userId,
      plaidItemId,
      encryptedAccessToken: encryptSecret(accessToken),
      institutionId,
      institutionName,
      status: "ACTIVE"
    }
  });

  await syncPlaidItem(item.id, SyncTrigger.INITIAL_CONNECT);
  return item;
}

export async function syncAllPlaidItemsForUser(userId: string, trigger: SyncTrigger) {
  const items = await prisma.plaidItem.findMany({
    where: {
      userId,
      status: {
        not: "UNSUPPORTED"
      }
    },
    select: {
      id: true
    }
  });

  for (const item of items) {
    await syncPlaidItem(item.id, trigger);
  }
}

export async function syncDuePlaidItems(trigger: SyncTrigger, olderThanMinutes = 15) {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const items = await prisma.plaidItem.findMany({
    where: {
      status: {
        not: "UNSUPPORTED"
      },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }]
    },
    select: {
      id: true
    },
    orderBy: {
      lastSyncedAt: "asc"
    },
    take: 200
  });

  for (const item of items) {
    await syncPlaidItem(item.id, trigger);
  }

  return items.length;
}
