async function onPayPalWebSdkLoaded() {
  try {
    const clientId = await getBrowserSafeClientId();
    const sdkInstance = await window.paypal.createInstance({
      clientId,
      components: ["paypal-guest-payments"],
    });

    configureGuestPaymentButton(sdkInstance);
  } catch (error) {
    console.error(error);
  }
}

async function configureGuestPaymentButton(sdkInstance) {
  try {
    const eligiblePaymentMethods = await sdkInstance.findEligibleMethods({
      currencyCode: "USD",
    });

    const paypalGuestPaymentSession =
      await sdkInstance.createPayPalGuestOneTimePaymentSession({
        onApprove,
        onCancel,
        onWarn,
        onError,
      });

    document
      .getElementById("paypal-basic-card-button")
      .addEventListener("click", onClick);

    async function onClick() {
      try {
        const startOptions = {
          presentationMode: "auto",
        };
        // get the promise reference by invoking createOrder()
        // do not await this async function since it can cause transient activation issues
        const createOrderPromise = createOrder();
        await paypalGuestPaymentSession.start(startOptions, createOrderPromise);
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function onApprove(data) {
  console.log("onApprove", data);
  const orderData = await captureOrder({
    orderId: data.orderId,
  });
  renderAlert({
    type: "success",
    message: `Order successfully captured! ${JSON.stringify(data)}`,
  });
  console.log("Capture result", orderData);
}

function onCancel(data) {
  renderAlert({ type: "warning", message: "onCancel() callback called" });
  console.log("onCancel", data);
}

function onWarn(error) {
  renderAlert({
    type: "warning",
    message: `onWarn() callback called: ${error}`,
  });
  console.log("onWarn", error);
}

function onError(error) {
  renderAlert({
    type: "danger",
    message: `onError() callback called: ${error}`,
  });
  console.log("onError", error);
}

async function getBrowserSafeClientId() {
  const response = await fetch("/paypal-api/auth/browser-safe-client-id", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch client id");
  }
  const { clientId } = await response.json();

  return clientId;
}
/* applepay */
async function loadApplePayPage() {
const clientToken = await getClientToken();
const clientMetadataId = crypto.randomUUID();

const sdkInstance = await window.paypal.createInstance({
clientToken,
clientMetadataId,
components: ["applepay-payments"],
});

const eligibility = await sdkInstance.findEligibleMethods();
if (!eligibility.isEligible("basic_apple_pay")) {
throw new Error("Not eligible for Apple Pay");
}
const applePayPaymentSession =
sdkInstance.createBasicApplePayOneTimePaymentSession({
onApprove: async ({ orderId }) => {
const response = await fetch(`/yourbackend/
orders/${orderId}/capture`, {
method: "POST",
});
 console.log("Order captured:", await response.json());
 },
 onCancel: () => console.log("Payment cancelled."),
 onError: (error) => console.error("Payment error:", error),
 });

 const canMakePayments = await
applePayPaymentSession.canMakePayments();
 if (!canMakePayments) {
 throw new Error("Apple Pay is not available on this
device/browser.");
 }

const button = document.createElement("button");
 button.textContent = "Checkout with Apple Pay";
 button.addEventListener("click", async () => {
 try {
 const checkoutSessionOptionsPromise =
createOrder().then((orderId) => ({
 orderId,
 }));
 await applePayPaymentSession.start({},
checkoutSessionOptionsPromise);
 } catch (error) {
 console.error("Payment cancelled or failed:", error);
 }
 });
  document.getElementById("applepay-container").appendChild(button);
 }

 async function createOrder() {
 const response = await fetch("/your-backend/orders", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 intent: "CAPTURE",
 purchase_units: [{ amount: { currency_code: "USD", value:
"10.00" } }],
 }),
 });
 const { id } = await response.json();
 return id;
 }

 loadApplePayPage();
/*applepay*/
async function createOrder() {
  const response = await fetch(
    "/paypal-api/checkout/orders/create-order-for-one-time-payment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error("Failed to create order");
  }
  const { id } = await response.json();
  renderAlert({ type: "info", message: `Order successfully created: ${id}` });

  return { orderId: id };
}

async function captureOrder({ orderId }) {
  const response = await fetch(
    `/paypal-api/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error("Failed to capture order");
  }
  const data = await response.json();

  return data;
}

function renderAlert({ type, message }) {
  const alertComponentElement = document.querySelector("alert-component");
  if (!alertComponentElement) {
    return;
  }

  alertComponentElement.setAttribute("type", type);
  alertComponentElement.innerText = message;
}
