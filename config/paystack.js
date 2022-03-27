const paystack = request => {
  const MySecretKey = process.env.PAY_KEY;

  const initializePayment = (form, mycallback) => {
    const option = {
      url: process.env.PAY_URL,
      headers: {
        authorization: MySecretKey,
        "content-type": "application/json",
        "cache-control": "no-cache"
      },
      form
    };
    const callback = (error, response, body) => {
      return mycallback(error, body);
    };
    request.post(option, callback);
  };

  const verifyPayment = (ref, mycallback) => {
    const option = {
      url:
        "https://api.paystack.co/transaction/verify/" + encodeURIComponent(ref),
      headers: {
        authorization: MySecretKey,
        "content-type": "application/json",
        "cache-control": "no-cache"
      }
    };
    const callback = (error, response, body) => {
      return mycallback(error, body);
    };
    request(option, callback);
  };
  return { initializePayment, verifyPayment };
};

module.exports = paystack;
