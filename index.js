const puppeteer = require('puppeteer');
const voters = require('./voters.json')
const fs = require('fs').promises;

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
        await inputDUI.type('036710269');
    } else {
        console.error('No se encontró el primer input');
    }

    // Seleccionar el segundo input por su nombre
    const inputSegundo = await page.$('input[name="ion-input-1"]');
    if (inputSegundo) {
        await inputSegundo.type('Henry@1234');
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

    let counter = 1;

    console.log(`Se van a verificar ${voters.length} votantes`)

    page.setRequestInterception(true);

    page.on('request', async interceptedRequest => {
        if (interceptedRequest.url().includes('api/addVoter') && interceptedRequest.method() === 'POST') {
            interceptedRequest.continue();
        } else {
            interceptedRequest.continue();
        }
    });

    for (const voter of voters) {

        await delay(800);

        console.log('\n');

        let dui = voter.documento.toString().replace(/-/g, '');

        dui = dui.length > 9 ? dui.substring(0, 9) : dui.padStart(9, '0');
        console.log(counter, ' - Verificando el DUI: ', dui);
        counter++;

        await delay(500);

        if (voter.verificado === true) {
            console.log(`Ya fue verificado`);
            continue;
        }

        if (!inputInsideDUI) {
            console.error('No se encontró el input dentro del elemento con la clase __voters-DUI');
            break;
        }

        await inputInsideDUI.click({
            clickCount: 3
        }); // Seleccionar el contenido actual del input

        await inputInsideDUI.type(dui, { delay: 100 }); // Ingresar el DUI

        // Espera a que se complete la llamada a la API después de ingresar el DUI
        const response = await waitForApiResponse(page);

        if (!response) {
            console.error('No se recibió respuesta de la API');

            await modifyJsonFile({
                dui: voter.documento,
                ok: false,
                reason: 'No se recibió respuesta de la API'
            });

            continue;
        }

        const responseBody = await response.json();

        // Evalúa la respuesta para determinar el estado
        if (!responseBody.ok) {
            console.log('El DUI es inválido:', responseBody.reason);

            await modifyJsonFile({
                dui: voter.documento,
                ok: false,
                reason: responseBody.reason
            });

            await delay(800);
            continue;
        }

        console.log(`Ingrensando el telefono ${voter.telefono}`);

        // formatear el telefono a 8 digitos, si no tiene 8 digitos, seguir al siguiente
        const telefono = voter.telefono.toString().replace(/-/g, '');

        if (telefono.length !== 8) {
            console.log('El telefono no tiene 8 digitos');
            await modifyJsonFile({
                dui: voter.documento,
                ok: false,
                reason: 'El telefono no tiene 8 digitos'
            });
            continue;
        }

        const inputTelefono = await page.$('.__voters-telefono input');

        if (!inputTelefono) {
            console.error('No se pudo encontrar el input del telefono');
            break;
        }

        await inputTelefono.click({
            clickCount: 3
        }); // Seleccionar el contenido actual del input

        await inputTelefono.type(voter.telefono.toString(), { delay: 100 });
        await delay(1500);

        const button = await page.$("#main-content > div.ion-page.can-go-back > div > div > ion-content > div > div > div.votersContainer > div > div.buttonContainer > ion-button")

        if (!button) {
            console.log('No se pudo encontrar el botón para guardar');
            break;
        }

        button.click();

        const saveResponse = await waitForApiResponse(page);

        if (!saveResponse) {
            console.error('No se recibió respuesta de la API');
            break;
        }

        const saveResponseBody = await saveResponse.json();

        if (saveResponseBody.ok) {
            console.log('El votante se guardó correctamente');

            await modifyJsonFile({
                dui: voter.documento,
                ok: true,
                reason: ''
            });
        } else {
            console.log('El votante no se pudo guardar:', saveResponseBody.reason);

            await modifyJsonFile({
                dui: voter.documento,
                ok: false,
                reason: saveResponseBody.reason
            });
        }
    }
};

async function waitForApiResponse(page) {
    return new Promise(resolve => {
        const timeout = setTimeout(() => {
            resolve(null); // Resuelve como nulo después de un tiempo limite
        }, 5000); // Cambia este valor al tiempo límite que desees

        page.waitForResponse(response => response.url().includes('api/addVoter') && response.status() === 200)
            .then(response => {
                clearTimeout(timeout);
                resolve(response);
            });
    });
}

async function modifyJsonFile(responseBody) {
    try {
        const data = await fs.readFile('voters.json', 'utf8');
        let jsonData = JSON.parse(data);

        const index = jsonData.findIndex(item => item.documento === responseBody.dui);

        if (index !== -1) {
            jsonData[index].verificado = true;
            jsonData[index].ok = responseBody.ok;
            jsonData[index].reason = responseBody.reason;

            await fs.writeFile('voters.json', JSON.stringify(jsonData, null, 2), 'utf8');
        } else {
            console.log('Documento no encontrado en el JSON');
        }
    } catch (error) {
        console.error('Error al modificar el archivo JSON:', error);
    }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

main();