import Sortable from 'sortablejs';
import { Message } from './Message';

export class SortableChat {
    private sortable: Sortable | null = null;

    constructor(private updateMessages: (messages: Message[]) => void) {}

    enable(container: HTMLDivElement, messages: Message[]) {
        this.sortable = Sortable.create(container, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const movedItem = messages.splice(evt.oldIndex!, 1)[0];
                messages.splice(evt.newIndex!, 0, movedItem);
                this.updateMessages(messages);
            },
        });
    }
}