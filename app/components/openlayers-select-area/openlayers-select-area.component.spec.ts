import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OpenlayersSelectAreaComponent } from './openlayers-select-area.component';

describe('OpenlayersSelectAreaComponent', () => {
  let component: OpenlayersSelectAreaComponent;
  let fixture: ComponentFixture<OpenlayersSelectAreaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ OpenlayersSelectAreaComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(OpenlayersSelectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
