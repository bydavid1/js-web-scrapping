const puppeteer = require('puppeteer');
const voters = require('./voters.json')

const main = async () => {
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

    await page.waitForSelector('.logout', {
        visible: true,
        timeout: 5000
    });

    console.log('Ya inició sesión');

    const buttonSelector = '#main-content > div > div > div > ion-content > div > div > div.homeButtonContainer.hbc-2 > ion-button:nth-child(3)';

    await page.waitForSelector(buttonSelector);
    await page.evaluate((buttonSelector) => {
        const button = document.querySelector(buttonSelector);
        if (button) {
            button.click();
        } else {
            console.error('No se pudo encontrar el botón con el selector especificado');
        }
    }, buttonSelector);

    await page.waitForSelector('.__voters-DUI', {
        visible: true
    });

    const inputInsideDUI = await page.$('.__voters-DUI input');

    const okSelector = '.duiLookup.ok';
    const errorSelector = '.duiLookup.error';
    const reasonSelector = '.duiLookup.ok .reason';
    const reasonErrorSelector = '.duiLookup.error .reason';

    let counter = 1;

    console.log(`Se van a verificar ${voters.length} votantes`)

    for (const voter of voters) {

        let dui = voter.documento.toString().replace(/-/g, '');

        dui = dui.length > 9 ? dui.substring(0, 9) : dui.padStart(9, '0');
        console.log(counter, ' - Verificando el DUI: ', dui);
        counter++;

        if (!inputInsideDUI) {
            console.error('No se encontró el input dentro del elemento con la clase __voters-DUI');
            break;
        }

        await inputInsideDUI.click({
            clickCount: 3
        }); // Seleccionar el contenido actual del input

        await inputInsideDUI.type(dui); // Ingresar el DUI

        await delay(3000);

        // verificar si se cargo el mensaje de error o el mensaje de ok
        await page.waitForSelector(`${okSelector}, ${errorSelector}, ${reasonSelector}, ${reasonErrorSelector}`, {
            visible: true
        });

        const ok = await page.$(okSelector);
        const error = await page.$(errorSelector);
        const reason = await page.$(reasonSelector);
        const reasonError = await page.$(reasonErrorSelector);

        if (reason || reasonError) {
            const reasonText = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    return element.textContent.trim();
                }
                return '';
            }, reason ? reasonSelector : reasonErrorSelector);

            if (ok) {
                console.log('El dui es valido, pero: ', reasonText);
            } else if (error) {
                console.log('El dui es invalido, porque: ', reasonText);
            } else {
                console.error('No se pudo determinar si el DUI es valido o no');
            }

            console.log('\n')

            await delay(2000);

            continue;
        }

        if (ok) {
            console.log(`Ingrensando el telefono ${voter.telefono}`);
            await delay(1000);

            const inputTelefono = await page.$('.__voters-telefono input');

            if (!inputTelefono) {
                console.error('No se pudo encontrar el input del telefono');
                break;
            }

            await inputTelefono.click({
                clickCount: 3
            }); // Seleccionar el contenido actual del input

            await inputTelefono.type(voter.telefono.toString());

            const button = await page.$("#main-content > div.ion-page.can-go-back > div > div > ion-content > div > div > div.votersContainer > div > div.buttonContainer > ion-button")

            if (!button) {
                console.log('No se pudo encontrar el botón para guardar');
                break
            }

            button.click();

            await delay(3000);

            const alert = await page.$('ion-alert');

            if (alert) {
                console.log('No se pudo agregar, hay una alerta');
            } else {
                console.log('Se ingresó el telefono correctamente');
            }

            console.log('\n');

        } else if (error) {
            console.log(`No se pudo ingresar el telefono ${voter.telefono} porque el DUI no es valido \n`);
            await delay(2000);
        } else {
            console.log('No se encontró el mensaje de error o de ok \n');
            await delay(2000);
        }
    }
};


const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

main();