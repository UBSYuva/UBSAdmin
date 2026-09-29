import { Component, inject } from '@angular/core';
import { ToastService } from '~/services/toast-service';

@Component({
    selector: 'app-toasts',
    template: `
		<ngb-toast
			*ngFor="let toast of toastService.toasts"
			[class]="toast.classname"
			[autohide]="true"
			[delay]="toast.delay || 5000"
			(hidden)="toastService.remove(toast)"
		>
			<ng-container *ngIf="isTemplate(toast); else text">
				<ng-template [ngTemplateOutlet]="toast.template"></ng-template>
			</ng-container>

			<ng-template #text>{{ toast.template }}</ng-template>
		</ngb-toast>
	`,
    host: { class: 'toast-container position-fixed top-0 end-0 p-3', style: 'z-index: 1200' },
})
export class ToastsContainer {
    toastService = inject(ToastService);

    isTemplate(toast: any) {
        return toast.template instanceof Object;
    }
}
