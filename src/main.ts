import puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--start-maximized", '--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.goto('https://finance.vietstock.vn/YTC-ctcp-xuat-nhap-khau-y-te-thanh-pho-ho-chi-minh.htm?tab=BCTN', { waitUntil: 'networkidle2' });

    await new Promise((r) => setTimeout(r, 1000));

    const allData: { [year: string]: { [key: string]: string } } = {};

    for (let i = 0; i < 6; i++) {
      const data = await page.$$eval('div.pos-relative div.table-responsive table.table-overview', (tables) =>
        tables.map((table) => {
          const years = Array.from(table.querySelectorAll('thead th:not(.col-name) b')).map((b) => b.textContent || '');
          const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) => ({
            name: row.querySelector('td span')?.textContent?.trim() || '',
            values: Array.from(row.querySelectorAll('td.text-right')).map((td) => td.textContent?.trim() || ''),
          }));

          const result: { [year: string]: { [key: string]: string } } = {};
          years.forEach((year, i) => {
            result[year] = {};
            rows.forEach((row) => {
              result[year][row.name] = row.values[i];
            });
          });

          return result;
        })
      );

      data.forEach((tableData) => {
        Object.entries(tableData).forEach(([year, indicators]) => {
          if (!allData[year]) {
            allData[year] = {};
          }
          Object.assign(allData[year], indicators);
        });
      });

      console.log(`Trang ${i + 1}:`, data);

      const button = await page.$('div.btn.btn-default.m-l > span.fa.fa-chevron-left.pull-left')
      if (!button) {
        console.log('Không tìm thấy nút Trang trước, dừng lại.');
        break;
      }

      await button.click();

      await new Promise((r) => setTimeout(r, 1000)); 
    }

    fs.writeFileSync('ytc_data.json', JSON.stringify(allData, null, 2));

  } catch (error) {
    console.error('Lỗi khi crawl:', error);
  } finally {
    await browser.close();
  }
}) ()