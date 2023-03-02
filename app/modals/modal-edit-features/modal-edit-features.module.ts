import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalEditFeaturesPageRoutingModule } from './modal-edit-features-routing.module';

import { ModalEditFeaturesPage } from './modal-edit-features.page';

import { ColorPickerModule } from 'ngx-color-picker';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalEditFeaturesPageRoutingModule,
    ColorPickerModule
  ],
  declarations: [ModalEditFeaturesPage]
})
export class ModalEditFeaturesPageModule {}
