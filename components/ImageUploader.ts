export class ImageUploader {
    constructor(private addMessage: (text: string, imageUrl?: string, audioUrl?: string) => void) {}

    render(container: HTMLDivElement) {
        const icon = container.createEl('span', {
            attr: { style: 'cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;' }
        });
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="white"/><path d="M20 4H16.83L15.59 2.65C15.22 2.24 14.68 2 14.12 2H9.88C9.32 2 8.78 2.24 8.4 2.65L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="white"/></svg>`;

        icon.addEventListener('click', () => this.addImage());
    }

    private addImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageUrl = event.target?.result as string;
                    this.addMessage('', imageUrl);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
}