import { TestBed } from '@angular/core/testing';

import { MembershipCatalog } from './membership-catalog';

describe('MembershipCatalog', () => {
  let service: MembershipCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembershipCatalog);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
