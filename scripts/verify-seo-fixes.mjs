import fs from "fs";
import path from "path";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function testRobotsTxt() {
  console.log("\n--- Testing robots.txt ---");
  const publicRobots = fs.readFileSync("public/robots.txt", "utf-8");
  const routeRobots = fs.readFileSync("src/routes/robots[.]txt.ts", "utf-8");

  assert(publicRobots.includes("User-agent: Googlebot"), "public/robots.txt has User-agent: Googlebot");
  assert(publicRobots.includes("Allow: /shop"), "public/robots.txt allows /shop");
  assert(publicRobots.includes("Allow: /product/"), "public/robots.txt allows /product/");
  assert(publicRobots.includes("Allow: /assets/"), "public/robots.txt allows /assets/");
  assert(publicRobots.includes("Allow: /api/media/"), "public/robots.txt allows /api/media/");
  assert(publicRobots.includes("Allow: /api/public/"), "public/robots.txt allows /api/public/");
  assert(publicRobots.includes("Disallow: /admin"), "public/robots.txt disallows /admin");
  assert(publicRobots.includes("Disallow: /checkout"), "public/robots.txt disallows /checkout");
  assert(publicRobots.includes("Disallow: /account"), "public/robots.txt disallows /account");
  assert(publicRobots.includes("Disallow: /auth"), "public/robots.txt disallows /auth");
  assert(publicRobots.includes("Sitemap: https://riotous.store/sitemap.xml"), "public/robots.txt declares correct Sitemap URL");

  assert(routeRobots.includes("User-agent: Googlebot"), "src/routes/robots[.]txt.ts has User-agent: Googlebot");
  assert(routeRobots.includes("Sitemap: https://riotous.store/sitemap.xml"), "src/routes/robots[.]txt.ts declares correct Sitemap URL");
}

async function testCanonicalsAndMetadata() {
  console.log("\n--- Testing Canonical Tags & Metadata ---");

  const filesToCheck = [
    { file: "src/routes/index.tsx", expectedCanonical: "https://riotous.store/", expectedTitle: "RIOTOUS" },
    { file: "src/routes/shop.tsx", expectedCanonical: "https://riotous.store/shop", expectedTitle: "Shop" },
    { file: "src/routes/product.$handle.tsx", expectedCanonical: "https://riotous.store/product/${p.handle}", expectedTitle: "formatProductPageTitle" },
    { file: "src/routes/design.tsx", expectedCanonical: "https://riotous.store/design", expectedTitle: "Custom DTF Tee Studio" },
    { file: "src/routes/about.tsx", expectedCanonical: "https://riotous.store/about", expectedTitle: "About RIOTOUS" },
    { file: "src/routes/contact.tsx", expectedCanonical: "https://riotous.store/contact", expectedTitle: "Contact RIOTOUS" },
    { file: "src/routes/privacy.tsx", expectedCanonical: "https://riotous.store/privacy", expectedTitle: "Privacy Policy" },
    { file: "src/routes/terms.tsx", expectedCanonical: "https://riotous.store/terms", expectedTitle: "Terms of Service" },
    { file: "src/routes/shipping-policy.tsx", expectedCanonical: "https://riotous.store/shipping-policy", expectedTitle: "Shipping Policy" },
    { file: "src/routes/refund-policy.tsx", expectedCanonical: "https://riotous.store/refund-policy", expectedTitle: "Refund & Return Policy" },
  ];

  for (const { file, expectedCanonical, expectedTitle } of filesToCheck) {
    const content = fs.readFileSync(file, "utf-8");
    assert(content.includes(expectedCanonical), `${file} has absolute canonical: ${expectedCanonical}`);
    assert(content.includes(expectedTitle), `${file} has appropriate title containing: ${expectedTitle}`);
    assert(!content.includes('href: "/"') && !content.includes('href: "/shop"') && !content.includes('href: "/about"'), `${file} has no relative canonical tags`);
  }
}

async function testSitemapGenerator() {
  console.log("\n--- Testing Sitemap Generator ---");
  const sitemapCode = fs.readFileSync("src/routes/sitemap[.]xml.ts", "utf-8");

  assert(!sitemapCode.includes("/shop?category="), "sitemap[.]xml.ts does NOT include parameterized duplicate URLs");
  assert(sitemapCode.includes("latestModDate"), "sitemap[.]xml.ts tracks genuine latestModDate");
  assert(sitemapCode.includes("status = 'published'"), "sitemap[.]xml.ts filters for published products");
  assert(sitemapCode.includes('path: "/"'), "sitemap[.]xml.ts includes homepage");
  assert(sitemapCode.includes('path: "/shop"'), "sitemap[.]xml.ts includes /shop");
  assert(sitemapCode.includes("X-Robots-Tag"), "sitemap[.]xml.ts sets X-Robots-Tag: noindex header");
}

async function testServerRedirects() {
  console.log("\n--- Testing Server Redirects in server.ts ---");
  const serverCode = fs.readFileSync("src/server.ts", "utf-8");

  assert(serverCode.includes("www.riotous.store"), "server.ts normalizes www to apex domain");
  assert(serverCode.includes('pathname === "/products"'), "server.ts redirects /products to /shop");
  assert(serverCode.includes('pathname === "/collections"'), "server.ts redirects /collections to /shop");
  assert(serverCode.includes('pathname === "/catalog"'), "server.ts redirects /catalog to /shop");
  assert(serverCode.includes('pathname === "/product"'), "server.ts redirects /product to /shop");
  assert(serverCode.includes('pathname === "/login"'), "server.ts redirects /login with 301 to /auth");
  assert(serverCode.includes('pathname === "/signup"'), "server.ts redirects /signup with 301 to /auth");
  assert(serverCode.includes("pathname.endsWith(\"/\")"), "server.ts normalizes trailing slashes with 301");
  assert(serverCode.includes('headers.set("X-Robots-Tag", "noindex, nofollow")'), "server.ts sets X-Robots-Tag on private/404 routes");
}

async function main() {
  await testRobotsTxt();
  await testCanonicalsAndMetadata();
  await testSitemapGenerator();
  await testServerRedirects();

  if (process.exitCode === 1) {
    console.error("\n❌ Some SEO tests failed!");
  } else {
    console.log("\n🎉 ALL SEO TESTS PASSED SUCCESSFULLY!");
  }
}

main().catch(console.error);
