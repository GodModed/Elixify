// electron boilerplate
const { app, Menu, Tray } = require('electron');
const { BrowserWindow } = require('electron-acrylic-window');
const fs = require('fs');
const path = require('path');

/**
 * @type {BrowserWindow}
 */
let windows = [];
/**
 * @type {Object}
 */
let enabled = require(path.join(__dirname, 'enabled.json')) || {};

async function loadWidgets() {
    const folders = await fs.promises.readdir(path.join(__dirname, 'widgets'));
    for (const folder of folders) {
        const widgetFolder = path.join(__dirname, 'widgets', folder);
        const metaDataConfig = require(path.join(widgetFolder, 'metadata.json'));
        const widgetHTMLLocation = path.join(widgetFolder, 'index.html');
        // get position from file if exists
        let position = [0, 0];
        if (fs.existsSync(path.join(__dirname, 'positions.json'))) {
            const positions = JSON.parse(fs.readFileSync(path.join(__dirname, 'positions.json')));
            const pos = positions.find(p => p.name === metaDataConfig.name);
            if (pos) {
                position = pos.position;
            }
        }
        let hidden = false;
        if (enabled[metaDataConfig.name] === false) {
            hidden = true;
        }
        const widget = new BrowserWindow({
            width: metaDataConfig.width,
            height: metaDataConfig.height,
            vibrancy: {
                theme: "dark",
                effect: "acrylic",
                useCustomWindowRefreshMethod: true,
                disableOnBlur: true,
            },
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
            resizable: false,
            title: metaDataConfig.name,
            icon: path.join(__dirname, 'assets', 'inverted-icon.png'),
            type: 'desktop',
            alwaysOnTop: false,
            skipTaskbar: true,
            x: position[0],
            y: position[1]
        });

        if (hidden) {
            widget.hide();
        }

        widget.on('close', (e) => {
            e.preventDefault();
            disableWidget(widget.getTitle());
        });

        widget.loadFile(widgetHTMLLocation);

        windows.push(widget);
    }
}

async function disableWidget(widgetName) {
    const widget = windows.find(w => w.getTitle() === widgetName);
    widget.hide();
}

async function enableWidget(widgetName) {
    const widget = windows.find(w => w.getTitle() === widgetName);
    widget.show();
}

app.on('ready', async () => {
    await loadWidgets();
    const tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
    const menuArray = [];
    for (const window of windows) {
        menuArray.push({
            label: window.getTitle(),
            type: 'checkbox',
            checked: enabled[window.getTitle()] === undefined ? true : enabled[window.getTitle()],
            click: (event) => {
                enabled[window.getTitle()] = event.checked;
                if (event.checked) {
                    enableWidget(window.getTitle());
                } else {
                    disableWidget(window.getTitle());
                }
            }
        })
    }
    const contextMenu = Menu.buildFromTemplate([
        ...menuArray,
        {
            label: 'Exit',
            click: () => {
                let positions = [];
                for (const window of windows) {
                    // save window position to file
                    positions.push({
                        name: window.getTitle(),
                        position: window.getPosition(),
                    });
                    window.destroy();
                }
                fs.writeFileSync(path.join(__dirname, 'enabled.json'), JSON.stringify(enabled));
                fs.writeFileSync(path.join(__dirname, 'positions.json'), JSON.stringify(positions));
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Elixify');
    tray.setContextMenu(contextMenu);
});