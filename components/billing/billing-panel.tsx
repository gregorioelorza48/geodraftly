"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerInfo, Offering, Package } from "@revenuecat/purchases-js";
import { Badge, Button, Card } from "@/components/ui";
import { firmAppUserId, hasRevenueCatKey, REVENUECAT_ENTITLEMENT, REVENUECAT_PUBLIC_KEY } from "@/lib/billing/config";

type BillingPanelProps = {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  userName: string;
  canManage: boolean;
};

type Status = "idle" | "loading" | "ready" | "checkout" | "error";

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function packagePeriod(pkg: Package) {
  const duration = pkg.webBillingProduct.normalPeriodDuration;
  if (!duration) return "One-time";
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/i.exec(duration);
  if (!match) return duration;
  const [, years, months, weeks, days] = match;
  if (years) return Number(years) === 1 ? "per year" : `every ${years} years`;
  if (months) return Number(months) === 1 ? "per month" : `every ${months} months`;
  if (weeks) return Number(weeks) === 1 ? "per week" : `every ${weeks} weeks`;
  if (days) return Number(days) === 1 ? "per day" : `every ${days} days`;
  return duration;
}

export function BillingPanel({
  organizationId,
  organizationName,
  userEmail,
  userName,
  canManage,
}: BillingPanelProps) {
  const [status, setStatus] = useState<Status>(hasRevenueCatKey() ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);

  const appUserId = firmAppUserId(organizationId);
  const configured = hasRevenueCatKey();

  const refresh = useCallback(async () => {
    if (!configured) return;
    const { Purchases } = await import("@revenuecat/purchases-js");
    if (!Purchases.isConfigured()) {
      Purchases.configure({
        apiKey: REVENUECAT_PUBLIC_KEY,
        appUserId,
      });
    } else if (Purchases.getSharedInstance().getAppUserId() !== appUserId) {
      await Purchases.getSharedInstance().changeUser(appUserId);
    }

    const purchases = Purchases.getSharedInstance();
    await purchases.setAttributes({
      $email: userEmail,
      $displayName: userName,
      firm: organizationName,
    });
    await purchases.preload();

    const [info, offerings] = await Promise.all([purchases.getCustomerInfo(), purchases.getOfferings()]);
    setCustomerInfo(info);
    setOffering(offerings.current);
    setStatus("ready");
  }, [appUserId, configured, organizationName, userEmail, userName]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void refresh()
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not load billing from RevenueCat.");
      });
    return () => {
      cancelled = true;
    };
  }, [configured, refresh]);

  const entitlement = customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT];
  const entitled = Boolean(entitlement);
  const packages = offering?.availablePackages ?? [];

  async function purchasePackage(pkg: Package) {
    if (!canManage) return;
    setError(null);
    setBusyPackageId(pkg.identifier);
    setStatus("checkout");
    try {
      const { Purchases, PurchasesError, ErrorCode } = await import("@revenuecat/purchases-js");
      const result = await Purchases.getSharedInstance().purchase({
        rcPackage: pkg,
        customerEmail: userEmail,
      });
      setCustomerInfo(result.customerInfo);
      setStatus("ready");
    } catch (err) {
      const { PurchasesError, ErrorCode } = await import("@revenuecat/purchases-js");
      if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
        setStatus("ready");
        return;
      }
      setStatus("ready");
      setError(err instanceof Error ? err.message : "Purchase did not complete.");
    } finally {
      setBusyPackageId(null);
    }
  }

  async function showPaywall() {
    if (!canManage || !offering) return;
    setError(null);
    setStatus("checkout");
    try {
      const { Purchases, PurchasesError, ErrorCode } = await import("@revenuecat/purchases-js");
      const result = await Purchases.getSharedInstance().presentPaywall({
        offering,
        customerEmail: userEmail,
      });
      setCustomerInfo(result.customerInfo);
      setStatus("ready");
    } catch (err) {
      const { PurchasesError, ErrorCode } = await import("@revenuecat/purchases-js");
      if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
        setStatus("ready");
        return;
      }
      setStatus("ready");
      setError(err instanceof Error ? err.message : "Paywall did not complete.");
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Current plan</p>
            <p className="mt-1 font-serif text-2xl text-ink">{organizationName}</p>
            <p className="mt-1 text-sm text-ink-soft">
              Billing is attached to the firm, so everyone in {organizationName} shares the same subscription.
            </p>
          </div>
          {configured ? (
            entitled ? (
              <Badge tone="good">Pro active</Badge>
            ) : status === "loading" ? (
              <Badge>Checking…</Badge>
            ) : (
              <Badge>Free</Badge>
            )
          ) : (
            <Badge tone="warn">Not connected</Badge>
          )}
        </div>
        {entitlement ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Entitlement</dt>
              <dd className="mt-1 text-ink">{entitlement.identifier}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Renews</dt>
              <dd className="mt-1 text-ink">
                {entitlement.willRenew ? formatDate(entitlement.expirationDate) ?? "Yes" : "Will not renew"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Product</dt>
              <dd className="mt-1 text-ink">{entitlement.productIdentifier}</dd>
            </div>
          </dl>
        ) : null}
        {customerInfo?.managementURL ? (
          <a
            href={customerInfo.managementURL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-field/40"
          >
            Manage subscription
          </a>
        ) : null}
      </Card>

      {!configured ? (
        <Card>
          <h2 className="font-serif text-xl text-ink">Connect RevenueCat</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Add a Web Billing public API key to start collecting subscriptions. The workbench stays usable without it.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink">
            <li>
              Create a project at{" "}
              <a className="font-semibold text-field underline" href="https://app.revenuecat.com" target="_blank" rel="noreferrer">
                app.revenuecat.com
              </a>{" "}
              and connect Stripe (or Paddle) under Web.
            </li>
            <li>Create products, an offering, and an entitlement named <code className="rounded bg-paper-2 px-1">{REVENUECAT_ENTITLEMENT}</code>.</li>
            <li>
              Copy the Web Billing public key (<code className="rounded bg-paper-2 px-1">rcb_</code> or sandbox{" "}
              <code className="rounded bg-paper-2 px-1">rcb_sb_</code>) into{" "}
              <code className="rounded bg-paper-2 px-1">NEXT_PUBLIC_REVENUECAT_API_KEY</code>.
            </li>
          </ol>
        </Card>
      ) : null}

      {configured && !canManage ? (
        <Card>
          <p className="text-sm leading-6 text-ink-soft">
            Client accounts can see plan status. A staff member of {organizationName} manages billing and upgrades.
          </p>
        </Card>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-clay/30 bg-clay/8 px-3 py-2 text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}

      {configured && canManage && packages.length > 0 ? (
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-ink">Plans</h2>
              <p className="mt-1 text-sm text-ink-soft">Prices come from the current RevenueCat offering.</p>
            </div>
            {offering?.hasPaywall ? (
              <Button type="button" variant="secondary" onClick={() => void showPaywall()} disabled={status === "checkout"}>
                Open paywall
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {packages.map((pkg) => {
              const product = pkg.webBillingProduct;
              const selected = busyPackageId === pkg.identifier;
              return (
                <Card key={pkg.identifier}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-deep">{pkg.identifier}</p>
                  <h3 className="mt-1 font-serif text-2xl text-ink">{product.title || product.displayName}</h3>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                    {product.currentPrice.formattedPrice}
                    <span className="ml-2 text-sm font-medium text-ink-soft">{packagePeriod(pkg)}</span>
                  </p>
                  {product.description ? <p className="mt-3 text-sm leading-6 text-ink-soft">{product.description}</p> : null}
                  <Button
                    type="button"
                    className="mt-5 w-full"
                    disabled={status === "loading" || status === "checkout"}
                    onClick={() => void purchasePackage(pkg)}
                  >
                    {selected ? "Opening checkout…" : entitled ? "Change plan" : "Subscribe"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {configured && canManage && status === "ready" && packages.length === 0 ? (
        <Card>
          <h2 className="font-serif text-xl text-ink">No offerings yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            The SDK connected, but RevenueCat has no current offering with packages. Add products to an offering in the
            dashboard and mark that offering as current.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
