
-- Update test invoices and tickets to use the real user's email
UPDATE invoices SET buyer_email = 'ns@smea.info' WHERE buyer_email = 'test@example.com';
UPDATE tickets SET buyer_email = 'ns@smea.info', user_id = 'f2e7e29c-f100-40ff-ae1e-a6191b951419' WHERE buyer_email = 'test@example.com';
