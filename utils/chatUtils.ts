import { Message } from '../components/Message';

/**
 * Adds a message to the messages array and renders it.
 */
export function addMessage(messages: Message[], container: HTMLDivElement, text: string, imageUrl?: string, audioUrl?: string): void {
    const message = new Message(text, imageUrl, audioUrl);
    messages.push(message);
    renderMessages(messages, container);
}

/**
 * Renders all messages in the chat container.
 */
export function renderMessages(messages: Message[], container: HTMLDivElement): void {
    container.empty();
    messages.forEach(message => message.render(container));
    container.scrollTop = container.scrollHeight;
}