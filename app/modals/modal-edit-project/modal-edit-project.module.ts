import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalEditProjectPageRoutingModule } from './modal-edit-project-routing.module';

import { ModalEditProjectPage } from './modal-edit-project.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalEditProjectPageRoutingModule
  ],
  declarations: [ModalEditProjectPage]
})
export class ModalEditProjectPageModule {}
