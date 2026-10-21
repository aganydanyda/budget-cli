import { TransactionType } from "./enums";

export interface ITransaction {
  readonly id: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly category: string;
  readonly date: string; // формат ГГГГ-ММ-ДД
  readonly description: string;
}

export interface IAccount {
  readonly id: string;
  name: string;
  transactions: ITransaction[];
}

export type AccountId = string;

export type TransactionInput = Omit<ITransaction, "id">;