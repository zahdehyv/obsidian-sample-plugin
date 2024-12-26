import { App, Modal, Notice } from 'obsidian';
import { AudioRecorder } from './AudioRecorder';
import { ImageUploader } from './ImageUploader';
import { SortableChat } from './SortableChat';
import { addMessage, renderMessages } from '../utils/chatUtils';
import { Message } from './Message';

export class ChatbotModal extends Modal {
    private chatContainer: HTMLDivElement;
    private textInput: HTMLTextAreaElement;
    private messages: Message[] = [];
    private audioRecorder: AudioRecorder;
    private imageUploader: ImageUploader;
    private sortableChat: SortableChat;
    public onSubmit: (messages: { text: string }[]) => Promise<void> | void;

    constructor(app: App) {
        super(app);
        this.audioRecorder = new AudioRecorder((text, imageUrl, audioUrl) => this.addMessage(text, imageUrl, audioUrl));
        this.imageUploader = new ImageUploader((text, imageUrl, audioUrl) => this.addMessage(text, imageUrl, audioUrl));
        this.sortableChat = new SortableChat((messages) => this.messages = messages);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.style.backgroundColor = '#1e1e1e';
        contentEl.style.color = '#ffffff';

        // Chat container
        this.chatContainer = contentEl.createEl('div', {
            attr: { style: 'height: 300px; overflow-y: auto; border: 1px solid #444; padding: 10px; margin-bottom: 10px; background: #2d2d2d;' }
        });

        // Input container
        const inputContainer = contentEl.createEl('div', {
            attr: { style: 'display: flex; align-items: center; gap: 10px;' }
        });

        // Text input
        this.textInput = inputContainer.createEl('textarea', {
            placeholder: 'Type a message...',
            attr: { style: 'flex: 1; height: 50px; resize: none; padding: 5px; border: 1px solid #444; border-radius: 5px; background: #2d2d2d; color: #ffffff;' }
        });

        // Send button
        const sendButton = inputContainer.createEl('span', {
            attr: { style: 'cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;' }
        });
        sendButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/></svg>`;
        sendButton.addEventListener('click', () => this.sendMessage());

        // Image uploader
        this.imageUploader.render(inputContainer);

        // Audio recorder
        this.audioRecorder.render(inputContainer);

        // Process button
        const processButton = contentEl.createEl('button', {
            text: 'Process Instructions',
            attr: { style: 'width: 100%; padding: 15px; background: #444; color: #ffffff; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; font-size: 16px;' }
        });
        processButton.addEventListener('click', () => this.submitList());

        // Enable drag-and-drop
        this.sortableChat.enable(this.chatContainer, this.messages);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    sendMessage() {
        const text = this.textInput.value.trim();
        if (text) {
            this.addMessage(text);
            this.textInput.value = '';
        }
    }

    addMessage(text: string, imageUrl?: string, audioUrl?: string) {
        addMessage(this.messages, this.chatContainer, text, imageUrl, audioUrl);
    }

    async submitList() {
        if (this.onSubmit) {
            await this.onSubmit(this.messages);
        }
    }
}