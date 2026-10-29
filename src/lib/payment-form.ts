/**
 * Submit a provider's payment form by POST. eSewa's ePay v2 endpoint only
 * accepts the signed fields as form data, so a plain redirect cannot start it.
 */
export function submitPaymentForm(action: string, data: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;

  for (const [name, value] of Object.entries(data)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
