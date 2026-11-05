const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TAGMAR_TEST_NODE_MODULES,'playwright'));
(async()=>{
 const root=path.resolve(__dirname,'..');
 const source=await fs.readFile(path.join(root,'modules/tesourosTagmar.js'),'utf8');
 const start=source.indexOf('function stripHtml('),end=source.indexOf('\nfunction stripMundaneMaintenance(',start);
 assert(start>=0&&end>start);
 const fixtures=['<strong>Bola de fogo</strong>: <img src="Images/TarefaOficial.png"> 6 metros &amp; dano.', '<p>Texto <b>completo</b>.</p><div>Outra linha</div>'];
 if(process.argv[2])fixtures.push(...JSON.parse(await fs.readFile(process.argv[2],'utf8')));
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage(),requests=[];
  await page.route('**/*',async route=>{
   const url=route.request().url();
   if(url==='http://treasure.test/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Teste de leitura do catálogo</body></html>'});
   requests.push(url);await route.fulfill({status:404,body:''});
  });
  await page.goto('http://treasure.test/');
  const baseline=await page.evaluate(values=>values.map(value=>{
   const div=document.createElement('div');div.innerHTML=value;return div.textContent.replace(/\s+/g,' ').trim();
  }),fixtures);
  await page.waitForTimeout(200);
  assert(requests.some(u=>u.endsWith('/Images/TarefaOficial.png')),'The test must reproduce the unwanted image request');
  requests.length=0;
  const actual=await page.evaluate(({fn,values})=>{
   const strip=new Function(fn+';return stripHtml;')();return values.map(strip);
  },{fn:source.slice(start,end),values:fixtures});
  await page.waitForTimeout(200);
  assert.deepEqual(actual,baseline,'Preserve every description as plain text');
  assert.deepEqual(requests,[],'Text-only catalog reads must not load external resources');
  console.log(`PASS: ${fixtures.length} HTML descriptions retain identical text; old code reproduces image 404; current catalog parser makes zero resource requests.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
