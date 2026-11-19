import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-product-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './product-rating.html',
  styleUrl: './product-rating.css',
})
export class ProductRating {
  readonly rating = input.required<number>();
  readonly clampedRating = computed(() =>
    Math.min(5, Math.max(0, this.rating())),
  );
}
