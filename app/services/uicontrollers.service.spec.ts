import { TestBed } from '@angular/core/testing';

import { UicontrollersService } from './uicontrollers.service';

describe('UicontrollersService', () => {
  let service: UicontrollersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UicontrollersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
