export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateWithDay(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(dateStr));
}
export function calculateEffectiveStatus(
  paymentStatus: string,
  billingTime: string,
  paymentTime: string | null,
  durationMonths: number
): { effectiveStatus: string; nextBillingDate: string } {
  let effectiveStatus = paymentStatus;
  let nextBillingDate = new Date(billingTime);

  if (paymentStatus === "success" && paymentTime) {
    const paymentDate = new Date(paymentTime);
    nextBillingDate = new Date(paymentDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + durationMonths);

    const now = new Date();
    const warningDate = new Date(nextBillingDate);
    warningDate.setDate(warningDate.getDate() - 7);

    if (now > nextBillingDate) {
      effectiveStatus = "overdue";
    } else if (now >= warningDate) {
      effectiveStatus = "pending";
    } else {
      effectiveStatus = "success";
    }
  } else if (paymentStatus === "pending" && billingTime) {
    const now = new Date();
    const billing = new Date(billingTime);
    if (now > billing) {
      effectiveStatus = "overdue";
    }
  }

  return { 
    effectiveStatus, 
    nextBillingDate: nextBillingDate.toISOString() 
  };
}
