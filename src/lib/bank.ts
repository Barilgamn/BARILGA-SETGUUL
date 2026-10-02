import { BankSettings } from '../types';

// The editorial office's account for orders. The admin panel can override it
// (settings.bank); this is what shows until then or if the database is down.
export const DEFAULT_BANK: BankSettings = {
  bankName: 'Хаан банк',
  accountNumber: '5175009575',
  accountName: 'БЗМТөв',
  iban: 'MN910005005175009575',
};

export const CONTACT_PHONE = '9100-0233';
export const CONTACT_EMAIL = 'order@barilga.mn';
export const CONTACT_PHONE_TEL = 'tel:+97691000233';
