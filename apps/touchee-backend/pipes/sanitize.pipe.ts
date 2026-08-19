import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.sanitize(value[key]);
      }
      return sanitized;
    }
    return value;
  }
}
