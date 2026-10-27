-- What people ask for to send you money: CLABE, account number and card number. Never the CVV or
-- expiration date, which only serve to charge the card.
alter table public.accounts
    add column clabe text check (clabe ~ '^\d{18}$'),
    add column account_number text check (account_number ~ '^\d{6,20}$'),
    add column card_number text check (card_number ~ '^\d{15,16}$'),
    add check (type <> 'cash' or (clabe is null and account_number is null and card_number is null));

-- What a business asks for to issue you a factura (CFDI 4.0). Codes from the SAT catalogs:
-- c_RegimenFiscal (e.g. 605 sueldos y salarios) and c_UsoCFDI (e.g. G03 gastos en general).
alter table public.profiles
    add column rfc text check (rfc ~ '^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$'),
    add column legal_name text check (length(trim(legal_name)) > 0),
    add column tax_zip text check (tax_zip ~ '^\d{5}$'),
    add column tax_regime text check (tax_regime ~ '^\d{3}$'),
    add column cfdi_use text check (cfdi_use ~ '^[A-Z]{1,2}\d{2}$');
