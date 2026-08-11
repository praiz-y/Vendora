"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Select } from "@/components/ui/Select";
import { useCheckout, useRetryPayment } from "@/features/checkout/hooks";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useCart } from "@/features/cart/hooks";
import { useAddresses } from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { Order } from "@/types/order";

function OrderResult({ order }: { order: Order }) {
  const retryPayment = useRetryPayment();
  // A successful retry must replace what's displayed — otherwise this stays
  // pinned to the original failed checkout's result forever, since that's a
  // separate mutation (useCheckout) from the one the Retry button drives
  // (useRetryPayment). Once the retry succeeds, prefer its result.
  const currentOrder = retryPayment.data?.order ?? order;

  if (currentOrder.status === "PAID") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage type="success">Payment successful — your order has been placed.</FormMessage>
        <Link href={`/orders/${currentOrder.id}`}>
          <Button>View order</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormMessage type="error">
        Payment failed. Your items are still reserved on this order — you can retry the payment below.
      </FormMessage>
      {retryPayment.isError && <FormMessage type="error">{getErrorMessage(retryPayment.error)}</FormMessage>}
      <div className="flex gap-3">
        <Button onClick={() => retryPayment.mutate({ orderId: currentOrder.id })} loading={retryPayment.isPending}>
          Retry payment
        </Button>
        <Link href={`/orders/${currentOrder.id}`}>
          <Button variant="secondary">View order</Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const authStatus = useRequireAuth();
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses } = useAddresses();
  const checkout = useCheckout();
  const [shippingAddressId, setShippingAddressId] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);

  // A successful checkout empties the cart (cart.service clears purchased
  // items), which would otherwise re-trigger this same "cart is empty, bounce
  // to /cart" redirect right as the success screen should appear — guard it
  // out once checkout has actually succeeded. And this must live in an
  // effect, not the render body: calling router.replace() while rendering
  // CheckoutPage updates the Router component mid-render of a different
  // component, which React (correctly) throws on.
  //
  // Also requires authStatus === "authenticated" first: useCart() is gated
  // with enabled: status === "authenticated", so before that resolves the
  // query never starts — TanStack reports isLoading: false for a disabled
  // query (not "still loading"), which otherwise reads as a confidently
  // empty cart for the split second before auth actually resolves, firing
  // a bogus redirect away from a checkout that has real items.
  const cartIsEmpty =
    authStatus === "authenticated" && !cartLoading && (!cart || cart.items.length === 0) && !checkout.isSuccess;
  useEffect(() => {
    if (cartIsEmpty) router.replace("/cart");
  }, [cartIsEmpty, router]);

  if (authStatus !== "authenticated" || cartLoading || cartIsEmpty) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  }

  if (checkout.isSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <OrderResult order={checkout.data.order} />
      </div>
    );
  }

  const needsShipping = cart!.items.some((item) => item.product.type === "PHYSICAL");
  const grandTotal = cart!.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  function handlePlaceOrder() {
    checkout.mutate({ shippingAddressId: shippingAddressId || undefined, simulateFailure });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Checkout</h1>

      <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold text-foreground/70">Order Summary</h2>
        <ul className="flex flex-col gap-2">
          {cart!.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatNaira(Number(item.product.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-black/10 pt-3 text-sm font-semibold dark:border-white/10">
          <span>Subtotal (shipping calculated per seller)</span>
          <span>{formatNaira(grandTotal)}</span>
        </div>
      </div>

      {needsShipping && (
        <div>
          {addresses && addresses.length > 0 ? (
            <Select
              label="Shipping address"
              name="shippingAddressId"
              required
              value={shippingAddressId}
              onChange={(e) => setShippingAddressId(e.target.value)}
            >
              <option value="">Select an address</option>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.fullName} — {address.addressLine1}, {address.city}
                </option>
              ))}
            </Select>
          ) : (
            <FormMessage type="error">
              You need a shipping address to check out.{" "}
              <Link href="/account/address" className="underline">
                Add one
              </Link>
              , then come back.
            </FormMessage>
          )}
        </div>
      )}

      {process.env.NODE_ENV !== "production" && (
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
          Simulate a payment failure (test — no real payment provider is wired up yet)
        </label>
      )}

      {checkout.isError && <FormMessage type="error">{getErrorMessage(checkout.error)}</FormMessage>}

      <Button
        onClick={handlePlaceOrder}
        loading={checkout.isPending}
        disabled={needsShipping && (!addresses || addresses.length === 0)}
        className="self-start"
      >
        Place order — {formatNaira(grandTotal)}
      </Button>
    </div>
  );
}
