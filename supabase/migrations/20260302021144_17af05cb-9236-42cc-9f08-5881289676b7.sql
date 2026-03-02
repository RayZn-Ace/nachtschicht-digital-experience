CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prefix text;
  _num integer;
  _year text;
  _result text;
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.invoice_config LIMIT 1;

  UPDATE public.invoice_config
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = now()
  WHERE id = _id
  RETURNING invoice_prefix, next_invoice_number - 1
  INTO _prefix, _num;

  _year := to_char(now(), 'YYYY');
  _result := _prefix || '-' || _year || '-' || lpad(_num::text, 5, '0');
  RETURN _result;
END;
$function$;