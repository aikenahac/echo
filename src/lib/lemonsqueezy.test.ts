import { describe, expect, it } from "vitest";
import { parseOrder } from "./lemonsqueezy";

const order = {
  type: "orders",
  id: "1",
  attributes: {
    store_id: 1,
    customer_id: 42,
    status: "paid",
    created_at: "2026-10-30T12:00:00.000000Z",
    first_order_item: { id: 9, order_id: 1, variant_id: 77, price: 1999 },
  },
};

describe("parseOrder", () => {
  it("reads the fields lifetime grants need", () => {
    expect(parseOrder(order)).toEqual({
      id: "1",
      customerId: 42,
      status: "paid",
      variantId: 77,
      createdAt: "2026-10-30T12:00:00.000000Z",
    });
  });

  it("rejects an order without an item", () => {
    const attributes = { ...order.attributes, first_order_item: undefined };
    expect(() => parseOrder({ ...order, attributes })).toThrow();
  });
});
