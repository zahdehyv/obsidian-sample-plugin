import { App, Plugin, Notice, Modal, PluginSettingTab, Setting } from 'obsidian';
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from '@google/generative-ai';
import WaveSurfer from 'wavesurfer.js'; // Ensure wavesurfer.js is installed

interface MyPluginSettings {
    GOOGLE_API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    GOOGLE_API_KEY: 'your-default-api-key',
};

class ChatbotModal extends Modal {
    private chatContainer: HTMLDivElement;
    private audioRecorder: AudioRecorder;
    private currentAudioUrl: string | null = null;
    private wavesurfer: WaveSurfer | null = null;
    private playButton: HTMLButtonElement | null = null;
    private genAI: GoogleGenerativeAI | null = null;

    constructor(app: App, googleApiKey: string) {
        super(app);
        this.audioRecorder = new AudioRecorder((audioUrl) => this.addAudio(audioUrl));
        if (googleApiKey) {
            this.genAI = new GoogleGenerativeAI(googleApiKey);
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.style.backgroundColor = '#1e1e1e';
        contentEl.style.color = '#ffffff';

        // Chat container (empty box for the audio)
        this.chatContainer = contentEl.createEl('div', {
            attr: { style: 'height: 100px; border: 1px solid #444; padding: 10px; margin-bottom: 10px; background: #2d2d2d; display: flex; align-items: center; justify-content: center;' }
        });

        // Add the microphone button at the bottom
        const buttonContainer = contentEl.createEl('div', {
            attr: { style: 'display: flex; justify-content: center; margin-top: 10px;' }
        });
        this.audioRecorder.render(buttonContainer);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    addAudio(audioUrl: string) {
        // Clear the previous audio if it exists
        this.chatContainer.empty();
    
        // Create a container for the waveform
        const waveformContainer = this.chatContainer.createEl('div', {
            attr: { style: 'flex: 1; margin-right: 10px; height: 50px;' }
        });
    
        // Initialize WaveSurfer with the audio URL directly
        this.wavesurfer = WaveSurfer.create({
            container: waveformContainer,
            waveColor: '#555', // Color of the waveform
            progressColor: '#1e90ff', // Color of the progress indicator
            barWidth: 2,
            barHeight: 1,
            barGap: 2,
            height: 50, // Height of the waveform
            cursorWidth: 0, // Hide the cursor
            interact: true, // Allow interaction (click to seek)
            url: audioUrl, // Load the audio URL directly
        });
    
        // Add play/pause button
        this.playButton = this.chatContainer.createEl('button', {
            attr: { style: 'background: none; border: none; cursor: pointer; margin-right: 10px;' }
        });
        this.updatePlayButton(false); // Initial state is paused

        this.playButton.addEventListener('click', () => {
            if (this.wavesurfer) {
                this.wavesurfer.playPause();
            }
        });

        // Update play button state based on WaveSurfer's play/pause events
        if (this.wavesurfer) {
            this.wavesurfer.on('play', () => this.updatePlayButton(true));
            this.wavesurfer.on('pause', () => this.updatePlayButton(false));
        }
    
        // Add process button
        const processButton = this.chatContainer.createEl('button', {
            attr: { 
                style: 'background: #6200ee; color: white; border: none; border-radius: 4px; padding: 10px 20px; font-size: 14px; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: background 0.3s, box-shadow 0.3s; margin-left: 10px;',
                disabled: 'true'
            }
        });
        processButton.innerText = 'Process';
    
        // Enable the process button when audio is recorded
        processButton.disabled = false;
        processButton.style.backgroundColor = '#6200ee';
        processButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    
        // Add hover and active effects for Material Design
        processButton.addEventListener('mouseenter', () => {
            if (!processButton.disabled) {
                processButton.style.backgroundColor = '#3700b3';
                processButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            }
        });
        processButton.addEventListener('mouseleave', () => {
            if (!processButton.disabled) {
                processButton.style.backgroundColor = '#6200ee';
                processButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            }
        });
        processButton.addEventListener('mousedown', () => {
            if (!processButton.disabled) {
                processButton.style.backgroundColor = '#000000';
                processButton.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
            }
        });
        processButton.addEventListener('mouseup', () => {
            if (!processButton.disabled) {
                processButton.style.backgroundColor = '#3700b3';
                processButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            }
        });
    
        // Add click event for processing
        processButton.addEventListener('click', async () => {
            new Notice('Processing audio...');
            await this.processAudio();
        });
    
        // Update the current audio URL
        this.currentAudioUrl = audioUrl;
    }

    private updatePlayButton(isPlaying: boolean) {
        if (this.playButton) {
            this.playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                    <path d="${isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>
                </svg>
            `;
        }
    }

    private async processAudio() {
        if (!this.currentAudioUrl) {
            new Notice('No audio to process.');
            return;
        }

        // Check if genAI is initialized
        if (!this.genAI) {
            new Notice('Google API key is not set. Please configure it in the settings.');
            return;
        }

        // Fetch the audio blob from the URL
        const response = await fetch(this.currentAudioUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // Convert the audio to base64
        const base64Audio = this.arrayBufferToBase64(arrayBuffer);

        // Define the tools (functions) for Gemini

        // Create a dictionary to map function names to their implementations
        const functions: { [name: string]: Function } = {
            createFile: this.createFile.bind(this),
            tellUser: this.tellUser.bind(this),
        };

        // Process the audio with Gemini
        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                systemInstruction:`
Eres un asistente inteligente con acceso a herramientas específicas para gestionar y manipular archivos, así como para comunicarte con el usuario. Entre tus capacidades, puedes:

1. **Crear archivos**: Puedes generar archivos en una ruta específica con un contenido determinado utilizando la función \`createFile\`. Los archivos deben ser en formato Markdown (.md) y utilizar sus facilidades, como encabezados (#), listas (-), negritas (**texto**), enlaces ([[filename]]), etc.
2. **Enviar mensajes al usuario**: Puedes comunicarte con el usuario de manera clara y directa utilizando la función \`tellUser\`. Los mensajes deben ser cortos, claros y concisos, evitando información innecesaria o extensa.
3. **Organizar archivos en carpetas**: Puedes crear carpetas para organizar los archivos si es necesario. Por ejemplo, si el archivo contiene información sobre un perro, puedes guardarlo en \`animales/perro.md\`.
4. **Documentar acciones**: Puedes crear un archivo que documente las acciones llevadas a cabo, como un registro de las tareas realizadas.
5. **Tomar decisiones autónomas**: En algunas ocasiones, debes decidir por tu cuenta si es necesario crear archivos o carpetas para cumplir con la solicitud del usuario de manera óptima.

Recuerda que toda comunicación o información que debas proporcionar al usuario final debe realizarse exclusivamente a través de la función \`tellUser\`. Los mensajes enviados a través de \`tellUser\` deben ser cortos y claros.

Cuando crees archivos, asegúrate de usar nombres que reflejen claramente el contenido del archivo. Por ejemplo, si el archivo contiene información sobre un informe financiero, un nombre adecuado podría ser \`informe_financiero_2023.md\`. Esto ayudará al usuario a identificar fácilmente el propósito del archivo.

Además, cuando generes contenido para archivos, utiliza formato Markdown para mejorar la legibilidad y estructura del texto. Por ejemplo, usa encabezados (#, ##), listas (-, *), negritas (**texto**) y otros elementos de Markdown para organizar la información de manera clara y profesional.

Como gestor de archivos, evalúa cuidadosamente si es necesario crear nuevos archivos o realizar cambios en los existentes. Solo procede con estas acciones si son esenciales para cumplir con la solicitud del usuario o si el usuario lo solicita explícitamente. Prioriza la claridad y la eficiencia en tu gestión, asegurándote de que todas las acciones estén justificadas y sean útiles para el usuario.
`,
tools:[
    {
        functionDeclarations: [
            {
                name: "createFile",
                description: "Crea un archivo en una ruta específica con un contenido determinado.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        path: { 
                            type: SchemaType.STRING, 
                            description: "La ruta del archivo a crear." 
                        },
                        content: { 
                            type: SchemaType.STRING, 
                            description: "El contenido del archivo." 
                        },
                    },
                    required: ["path", "content"],
                },
            },
            {
                name: "tellUser",
                description: "Envía un mensaje al usuario.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        message: { 
                            type: SchemaType.STRING, 
                            description: "El mensaje a enviar al usuario." 
                        },
                    },
                    required: ["message"],
                },
            },
        ],
    },
],
                toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: base64Audio,
                        mimeType: 'audio/wav',
                    },
                },
                { text: `
Escucha las instrucciones en el audio y actúa en consecuencia. Sigue al pie de la letra las indicaciones para ofrecer el resultado óptimo. Recuerda que:

1. **Los archivos deben ser en formato Markdown (.md)** y utilizar sus facilidades, como encabezados (#), listas (-), negritas (**texto**), enlaces ([[filename]]), etc.
2. **Puedes crear carpetas** para organizar los archivos si es necesario. Por ejemplo, si el archivo contiene información sobre un perro, puedes guardarlo en \`animales/perro.md\`.
3. **Puedes crear un archivo** que documente las acciones llevadas a cabo, como un registro de las tareas realizadas.
4. **Los mensajes al usuario** deben ser cortos, claros y concisos. Usa la función \`tellUser\` para comunicarte con el usuario.
5. **En algunas ocasiones, decide por tu cuenta** si es necesario crear archivos o carpetas para cumplir con la solicitud del usuario de manera óptima.

Actúa de manera autónoma y eficiente, asegurándote de que todas las acciones estén justificadas y sean útiles para el usuario.
` },
            ]);

            // Handle function calls in the response
            if (result.response.candidates) {
                for (const candidate of result.response.candidates) {
                    for (const part of candidate.content.parts) {
                        if (part.functionCall) {
                            const { name, args } = part.functionCall;
                            const functionRef = functions[name];
                            if (!functionRef) {
                                throw new Error(`Unknown function "${name}"`);
                            }

                            // Execute the function
                            const functionResponse = await functionRef(args);
                            new Notice(`Function "${name}" executed: ${functionResponse}`);
                        }
                    }
                }
            }

            const response = await result.response;
            const text = response.text();
            new Notice(`Gemini Response: ${text}`);
        } catch (error) {
            new Notice('Failed to process audio with Gemini.');
            console.error('Error processing audio:', error);
        }
    }

    private async createFile(args: { path: string; content: string }): Promise<string> {
        try {
            // Replace escaped newlines with actual newlines
            const contentWithNewlines = args.content.replace(/\\n/g, '\n');
    
            // Extract the folder path from the file path
            const folderPath = args.path.split('/').slice(0, -1).join('/');
    
            // Check if the folder path exists, and create it if it doesn't
            if (folderPath) {
                const folderExists = await this.app.vault.adapter.exists(folderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(folderPath);
                    new Notice(`Created folder: ${folderPath}`);
                }
            }
    
            // Write the file with the corrected content
            await this.app.vault.adapter.write(args.path, contentWithNewlines);
            new Notice(`File created successfully at ${args.path}`);
            return `File created successfully at ${args.path}`;
        } catch (error) {
            throw new Error(`Failed to create file: ${error}`);
        }
    }

    private tellUser(args: { message: string }): string {
        new Notice(args.message);
        return `User notified with message: ${args.message}`;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private icon: HTMLSpanElement | null = null;

    constructor(private addAudio: (audioUrl: string) => void) {}

    render(container: HTMLDivElement) {
        this.icon = container.createEl('span', {
            attr: { style: 'cursor: pointer; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #444; transition: background 0.2s; margin: 10px auto;' }
        });
        this.icon.innerHTML = `
            <svg viewBox="0 0 82.05 122.88" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                <path d="M59.89,20.83V52.3c0,27-37.73,27-37.73,0V20.83c0-27.77,37.73-27.77,37.73,0Zm-14.18,76V118.2a4.69,4.69,0,0,1-9.37,0V96.78a40.71,40.71,0,0,1-12.45-3.51A41.63,41.63,0,0,1,12.05,85L12,84.91A41.31,41.31,0,0,1,3.12,71.68,40.73,40.73,0,0,1,0,56a4.67,4.67,0,0,1,8-3.31l.1.1A4.68,4.68,0,0,1,9.37,56a31.27,31.27,0,0,0,2.4,12.06A32,32,0,0,0,29,85.28a31.41,31.41,0,0,0,24.13,0,31.89,31.89,0,0,0,10.29-6.9l.08-.07a32,32,0,0,0,6.82-10.22A31.27,31.27,0,0,0,72.68,56a4.69,4.69,0,0,1,9.37,0,40.65,40.65,0,0,1-3.12,15.65A41.45,41.45,0,0,1,70,85l-.09.08a41.34,41.34,0,0,1-11.75,8.18,40.86,40.86,0,0,1-12.46,3.51Z"/>
            </svg>
        `;

        this.icon.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.startRecording();
        });
        this.icon.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.stopRecording();
        });
        this.icon.addEventListener('mouseleave', () => {
            if (this.mediaRecorder?.state === 'recording') this.stopRecording();
        });

        this.icon.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.icon.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
        this.icon.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        this.icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.mediaRecorder?.state === 'recording') this.stopRecording();
            else this.startRecording();
        });
    }

    private async startRecording() {
        if (this.mediaRecorder?.state === 'recording') return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.recordedChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            this.addAudio(audioUrl);
            this.setRecordingIndicator(false);
        };

        this.mediaRecorder.start();
        this.setRecordingIndicator(true);
    }

    private stopRecording() {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }

    private setRecordingIndicator(isRecording: boolean) {
        if (this.icon) {
            this.icon.style.backgroundColor = isRecording ? '#ff0000' : '#444';
        }
    }
}

class SampleSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: MyPlugin) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

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

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // Pass the API key to the ChatbotModal
        this.addRibbonIcon('message-circle', 'Open Chatbot', () => {
            new ChatbotModal(this.app, this.settings.GOOGLE_API_KEY).open();
        });

        this.addCommand({
            id: 'open-chatbot',
            name: 'Open Chatbot',
            callback: () => {
                new ChatbotModal(this.app, this.settings.GOOGLE_API_KEY).open();
            }
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}