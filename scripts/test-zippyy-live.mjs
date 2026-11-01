// Quick test script to verify live authentication against Zippyy Production API
const baseUrl = "https://sellingpartnerapi-in.zippyy.ai";
const emailAddress = "sarthakgujarati5080@gmail.com";
const password = "Riotous@5405";

async function testAuth() {
  console.log(`Connecting to ${baseUrl}/v1/external/auth/login with ${emailAddress}...`);
  try {
    const res = await fetch(`${baseUrl}/v1/external/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-version": "1",
      },
      body: JSON.stringify({
        emailAddress: emailAddress,
        email: emailAddress,
        password: password,
      }),
    });

    const status = res.status;
    const data = await res.json().catch(async () => await res.text());
    console.log("HTTP Status:", status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (res.ok && data.accessToken) {
      console.log("SUCCESS: Zippyy accessToken received!");
      
      // Test serviceability with Surat pickup pincode 395006
      console.log("\nTesting Serviceability for 395006 -> 400050 (Mumbai)...");
      const sRes = await fetch(`${baseUrl}/v1/external/carrier/serviceability?origin_pin=395006&destination_pin=400050`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-version": "1",
          Authorization: `Bearer ${data.accessToken}`,
        }
      });
      const sData = await sRes.json().catch(async () => await sRes.text());
      console.log("Serviceability Status:", sRes.status);
      console.log("Serviceability Result:", JSON.stringify(sData, null, 2));
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testAuth();
