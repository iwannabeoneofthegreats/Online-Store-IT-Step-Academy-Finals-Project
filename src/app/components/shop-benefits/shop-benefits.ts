import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shop-benefits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop-benefits.html',
  styleUrl: './shop-benefits.scss',
})
export class ShopBenefits {}
