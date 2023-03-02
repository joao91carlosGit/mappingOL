import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

@Injectable({
	providedIn: 'root'
})
export class UicontrollersService {

	constructor(

		private alertController: AlertController,
		private toastController: ToastController

	) { }

	presentAlertConfirm(header: string, message: string, confirmText: string = "Confirmar", cancelText: string = "Cancelar"): Promise<boolean> {
		return new Promise(resolve => {
			return this.alertController.create({
				header: header,
				message: message,
				buttons: [
					{
						text: cancelText,
						role: 'cancel',
						handler: () => {
							resolve(false);
						}
					}, {
						text: confirmText,
						role: 'confirm',
						handler: () => {
							resolve(true);
						}
					}
				]
			}).then(alert => {
				return alert.present();
			});
		});
	}

	/** Create toast */
	presentToast(text: string, duration: number = 3000, position: string = 'bottom'): Promise<void> {
        return this.toastController.create({
            message: text,
            position: position as 'bottom' | 'top' | 'middle',
            duration: duration
        }).then(toast => {
            return toast.present();
        });
    }
}