import { randomUUID } from "crypto";
import { TransactionType } from "./enums";
import { IAccount, TransactionInput } from "./interfaces";
import { Transaction } from "./Transaction";

// Счёт со списком своих транзакций. 
export class Account implements IAccount {
  public readonly id: string;
  public name: string;
  private readonly _transactions: Transaction[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  // Копия списка, чтобы снаружи нельзя было менять массив напрямую.
  public get transactions(): Transaction[] {
    return [...this._transactions];
  }

  public addTransaction(input: TransactionInput): Transaction {
    const transaction: Transaction = new Transaction(randomUUID(), input);
    this._transactions.push(transaction);
    return transaction;
  }

  // Возвращает true, если транзакция найдена и удалена.
  public removeTransaction(transactionId: string): boolean {
    const index: number = this._transactions.findIndex(
      (t: Transaction): boolean => t.id === transactionId
    );
    if (index === -1) {
      return false;
    }
    this._transactions.splice(index, 1);
    return true;
  }

  public getBalance(): number {
    return this._transactions.reduce((sum: number, t: Transaction): number => {
      return t.type === TransactionType.Income ? sum + t.amount : sum - t.amount;
    }, 0);
  }

  // Содержимое CSV-файла: заголовок и по строке на транзакцию.
  public toCsv(): string {
    const rows: string[] = this._transactions.map((t: Transaction): string => t.toCsvRow());
    return [Transaction.CSV_HEADER, ...rows].join("\n");
  }
}