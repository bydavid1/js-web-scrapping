const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized'],
    });
    const page = await browser.newPage();
    const url = 'https://cyan.nuevasideas.com/login';

    await page.goto(url);

    const inputDUI = await page.$('input[name="ion-input-0"]');
    if (inputDUI) {
        await inputDUI.type('');
    } else {
        console.error('No se encontró el primer input');
    }

    // Seleccionar el segundo input por su nombre
    const inputSegundo = await page.$('input[name="ion-input-1"]');
    if (inputSegundo) {
        await inputSegundo.type('');
    } else {
        console.error('No se encontró el segundo input');
    };

    await page.evaluate(() => {
        const buttons = document.querySelectorAll('ion-button');
        for (const button of buttons) {
            if (button.textContent.trim() === 'Acceder') {
                button.click();
                break;
            }
        }
    });

    await page.waitForSelector('ion-button.md.button.button-large.button-solid.button-strong.ion-activatable.ion-focusable.hydrated', { visible: true, timeout: 5000 });

    // Seleccionar el segundo botón con la clase específica
    const buttons = await page.$$('ion-button.md.button.button-large.button-solid.button-strong.ion-activatable.ion-focusable.hydrated');

    if (buttons.length >= 2) {
        const secondButton = await page.evaluateHandle((button) => button, buttons[1]);
        await secondButton.click(); // Hacer clic en el segundo botón
    } else {
        console.error('No se encontraron al menos dos botones con la clase específica');
    }

    // Esperar a que el elemento con la clase __voters-DUI esté presente en el DOM
    await page.waitForSelector('.__voters-DUI', { visible: true, timeout: 5000 });

    // Seleccionar el input dentro del elemento con la clase __voters-DUI
    const inputInsideDUI = await page.$('.__voters-DUI input');

    if (inputInsideDUI) {
        await inputInsideDUI.type('123456789'); // Reemplaza 'Texto a escribir' con tu información
    } else {
        console.error('No se encontró el input dentro del elemento con la clase __voters-DUI');
    }
})();