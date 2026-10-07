async function main() {
  const res = await fetch('https://riotous.store/product/125248856-3ko4');
  const html = await res.text();
  
  const matches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    const text = m[1];
    if (text.includes('125248856-3ko4') && text.includes('$_TSR')) {
      const idx = text.indexOf('handle:"125248856-3ko4"');
      console.log(text.slice(idx, idx + 3000));
    }
  }
}
main().catch(console.error);
