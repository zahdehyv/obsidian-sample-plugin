import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from '../main';

export class SampleSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: MyPlugin) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

        // Add Google API key setting
        new Setting(containerEl)
            .setName('Google API key')
            .setDesc('It\'s a secret API key')
            .addText(text => {
                text
                    .setPlaceholder('Enter your API key')
                    .setValue(this.plugin.settings.GOOGLE_API_KEY)
                    .inputEl.setAttribute('type', 'password');
                text.onChange(async (value) => {
                    this.plugin.settings.GOOGLE_API_KEY = value;
                    await this.plugin.saveSettings();
                });
            });

    }
}