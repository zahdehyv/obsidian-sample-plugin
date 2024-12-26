export class Message {
    constructor(
        public text: string,
        public imageUrl?: string,
        public audioUrl?: string,
        public id: string = Date.now().toString()
    ) {}

    render(container: HTMLDivElement) {
        const messageDiv = container.createEl('div', {
            attr: { style: 'margin-bottom: 10px; padding: 10px; border: 1px solid #444; border-radius: 5px; background: #444; position: relative;' }
        });

        // Text content
        const textDiv = messageDiv.createEl('div', {
            text: this.text,
            attr: { style: 'color: #ffffff; margin-bottom: 10px; margin-left: 30px;' }
        });

        // Image content
        if (this.imageUrl) {
            messageDiv.createEl('img', {
                attr: { src: this.imageUrl, style: 'max-width: 100%; max-height: 150px; border-radius: 5px; margin-left: 30px;' }
            });
        }

        // Audio content
        if (this.audioUrl) {
            const audioContainer = messageDiv.createEl('div', {
                attr: { style: 'display: flex; align-items: center; margin-left: 30px; margin-top: 10px;' }
            });
            audioContainer.createEl('audio', {
                attr: { src: this.audioUrl, controls: true, style: 'width: 100%; max-width: 250px; background: #555; border-radius: 5px; padding: 5px;' }
            });
        }

        // Delete button (white trash can icon)
        const deleteButton = messageDiv.createEl('span', {
            attr: { style: 'position: absolute; top: 5px; right: 5px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;' }
        });
        deleteButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;
        deleteButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this message?')) {
                container.removeChild(messageDiv);
            }
        });
    }
}