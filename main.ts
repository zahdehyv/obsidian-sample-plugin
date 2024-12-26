import { App, Plugin, Notice } from 'obsidian';
import { ChatbotModal } from './components/ChatbotModal';
import { SampleSettingTab } from './settings/SampleSettingTab';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MyPluginSettings {
    GOOGLE_API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    GOOGLE_API_KEY: 'your-default-api-key',
};

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // Add a ribbon icon to open the chatbot interface
        this.addRibbonIcon('message-circle', 'Open Chatbot', () => {
            const modal = new ChatbotModal(this.app);
            modal.onSubmit = async (messages) => {
                try {
                    const response = await this.processList(messages);
                    new Notice('Processing complete!');
                    console.log('Gemini response:', response);
                } catch (error) {
                    new Notice('Failed to process list. Please try again.');
                    console.error('Error processing list:', error);
                }
            };
            modal.open();
        });

        // Add a command to open the chatbot interface
        this.addCommand({
            id: 'open-chatbot',
            name: 'Open Chatbot',
            callback: () => {
                const modal = new ChatbotModal(this.app);
                modal.onSubmit = async (messages) => {
                    try {
                        const response = await this.processList(messages);
                        new Notice('Processing complete!');
                        console.log('Gemini response:', response);
                    } catch (error) {
                        new Notice('Failed to process list. Please try again.');
                        console.error('Error processing list:', error);
                    }
                };
                modal.open();
            }
        });

        // Add a settings tab
        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Processes a list of items and generates a response using the Gemini API.
     * @param items - A list of items with text content.
     * @returns The generated response.
     */
    private async processList(items: { text: string }[]): Promise<string> {
        const genAI = new GoogleGenerativeAI(this.settings.GOOGLE_API_KEY);
        const model = await genAI.getGenerativeModel({ model: 'gemini-pro' });

        const listContent = items.map(item => item.text).join('\n');
        const prompt = `Here is a list of items:\n${listContent}\n\nGenerate a response based on this list:`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating content with Gemini:', error);
            throw error;
        }
    }
}