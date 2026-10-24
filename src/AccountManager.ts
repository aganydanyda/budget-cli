import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { Account } from "./Account";
import { AccountId } from "./interfaces";
 
// Хранит все счета и управляет ими.
export class AccountManager {
  private static readonly EXPORT_DIR: string = "exports";
 
  private readonly accounts: Map<AccountId, Account> = new Map<AccountId, Account>();
 
  // Создаёт счёт с уникальным ID.
  public createAccount(name: string): Account {
    let id: AccountId = randomUUID();
    while (this.accounts.has(id)) {
      id = randomUUID();
    }
    const account: Account = new Account(id, name.trim());
    this.accounts.set(id, account);
    return account;
  }
 
  public getAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }
 
  public getAccount(id: AccountId): Account | undefined {
    return this.accounts.get(id);
  }
 
  // Удаляет счёт и все его транзакции. Возвращает true, если счёт был найден.
  public deleteAccount(id: AccountId): boolean {
    const account: Account | undefined = this.accounts.get(id);
    if (account === undefined) {
      return false;
    }
    for (const transaction of account.transactions) {
      account.removeTransaction(transaction.id);
    }
    return this.accounts.delete(id);
  }
 
  // Записывает данные счёта в файл exports/<fileName>.csv и возвращает путь к нему.
  public async exportToCsv(id: AccountId, fileName: string): Promise<string> {
    const account: Account | undefined = this.accounts.get(id);
    if (account === undefined) {
      throw new Error(`Счёт с ID ${id} не найден`);
    }
 
    const directory: string = path.join(process.cwd(), AccountManager.EXPORT_DIR);
    await fs.promises.mkdir(directory, { recursive: true });
 
    // basename защищает от выхода за пределы папки exports; .csv добавляем сами
    const safeName: string = path.basename(fileName.replace(/\.csv$/i, ""));
    const filePath: string = path.join(directory, `${safeName}.csv`);
 
    // BOM в начале нужен, чтобы Excel правильно показывал русские буквы
    await fs.promises.writeFile(filePath, "\uFEFF" + account.toCsv(), "utf-8");
    return filePath;
  }
}