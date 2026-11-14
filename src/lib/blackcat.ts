// Builds the BlackCat "create sale" body from an order priced by buildOrder (cart-core.js).
// Pure (no secrets, no network) so the money rules can be tested.

export type OrderProduct = { code: string; name: string; unit_price: number; quantity: number };
export type PricedOrder = {
  products: OrderProduct[];
  totals: { products: number; shipping: number; discount: number; total: number; currency: string };
};
export type SaleItem = { title: string; unitPrice: number; quantity: number; tangible: boolean };
export type SaleInput = {
  customer: { name: string; email: string; document: string; phone: string };
  address: { zipcode: string; street: string; number: string; complement: string; district: string; city: string; state: string };
  tracking?: Record<string, string> | undefined;
};

const digits = (s: string) => s.replace(/\D/g, "");

// Items always add up to the order total: a coupon discount is spread over the
// product lines (each becomes one line with its total), the last line takes the rounding.
export function saleItems(order: PricedOrder): SaleItem[] {
  const { discount, shipping } = order.totals;
  let items: SaleItem[];
  if (discount > 0) {
    const base = order.products.map((p) => p.unit_price * p.quantity);
    const sum = base.reduce((s, n) => s + n, 0);
    let left = discount;
    items = order.products.map((p, i) => {
      const share = i === order.products.length - 1 ? left : Math.round((discount * base[i]!) / sum);
      left -= share;
      return { title: p.quantity > 1 ? `${p.name} x${p.quantity}` : p.name, unitPrice: base[i]! - share, quantity: 1, tangible: true };
    });
  } else {
    items = order.products.map((p) => ({ title: p.name, unitPrice: p.unit_price, quantity: p.quantity, tangible: true }));
  }
  if (shipping > 0) items.push({ title: "Frete", unitPrice: shipping, quantity: 1, tangible: false });
  return items;
}

export type CardInput = { number: string; holderName: string; expiryMonth: string; expiryYear: string; cvv: string };
export type DeviceInput = {
  http_browser_language?: string | undefined;
  http_browser_color_depth?: number | undefined;
  http_browser_screen_height?: number | undefined;
  http_browser_screen_width?: number | undefined;
  http_browser_time_difference?: number | undefined;
  http_browser_java_enabled?: boolean | undefined;
  http_browser_javascript_enabled?: boolean | undefined;
  user_agent?: string | undefined;
};

function baseSaleBody(order: PricedOrder, input: SaleInput, ref: string) {
  const { customer, address, tracking = {} } = input;
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].filter((k) => tracking[k]).map((k) => [k, tracking[k]]),
  );
  return {
    amount: order.totals.total,
    currency: "BRL",
    items: saleItems(order),
    customer: {
      name: customer.name,
      email: customer.email,
      phone: digits(customer.phone),
      document: { number: digits(customer.document), type: "cpf" },
    },
    shipping: {
      name: customer.name,
      street: address.street,
      number: address.number,
      ...(address.complement ? { complement: address.complement } : {}),
      neighborhood: address.district,
      city: address.city,
      state: address.state.toUpperCase(),
      zipCode: digits(address.zipcode),
    },
    externalRef: ref,
    metadata: `Pedido ${ref}`,
    ...utm,
  };
}

export function pixSaleBody(order: PricedOrder, input: SaleInput, ref: string) {
  return { ...baseSaleBody(order, input, ref), paymentMethod: "pix", pix: { expiresInDays: 1 } };
}

// The card goes straight to BlackCat; it is never stored or logged.
export function cardSaleBody(order: PricedOrder, input: SaleInput, ref: string, card: CardInput, installments: number, device: DeviceInput) {
  return {
    ...baseSaleBody(order, input, ref),
    paymentMethod: "credit_card",
    card: { ...card, number: digits(card.number), cvv: digits(card.cvv), installments },
    device,
  };
}
