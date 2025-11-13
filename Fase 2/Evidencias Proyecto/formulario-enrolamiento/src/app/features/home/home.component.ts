import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipApi, MembershipCatalog } from '../../core/services/membership-catalog';


interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
}

interface ClassCard {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

// ViewModel para la tarjeta de membresía (sin lógica de descuentos)
interface MembershipCard {
  code: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  durationLabel: string;
  scopeLabel: string;
  highlight?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [RouterModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  currentSlide = signal(0);
  private autoplayInterval: any;

  heroSlides: HeroSlide[] = [
    {
      image: 'assets/Imagen1.png',
      title: 'Sé tu mejor versión',
      subtitle: 'Entrena con los mejores profesionales',
    },
    {
      image: 'assets/Imagen2.jpg',
      title: 'Alcanza tus metas',
      subtitle: 'Programas personalizados para ti',
    },
    {
      image: 'assets/Imagen3.jpg',
      title: 'Únete a nuestra comunidad',
      subtitle: 'Más de 500 miembros activos',
    },
  ];

  classes: ClassCard[] = [
    {
      id: 'yoga',
      title: 'Yoga',
      description:
        'Te invitamos a nuestra clase de yoga, centrada en la armonía mente-cuerpo, en donde vas a explorar un viaje de autodescubrimiento y revitalización a través de las prácticas milenarias del yoga.',
      image: 'assets/class-yoga.jpg',
      link: '/classes/yoga',
    },
    {
      id: 'spinbike',
      title: 'Spinbike',
      description:
        'Una clase que se realiza sobre una bicicleta estática al ritmo de la música, en la que se efectúa un trabajo cardiovascular de alta intensidad.',
      image: 'assets/class-spin.jpg',
      link: '/classes/spinbike',
    },
    {
      id: 'cardiobox',
      title: 'Cardio box',
      description:
        'Ejercicios que combinan los golpes de box al ritmo de la música, trabajando resistencia, fuerza, coordinación y flexibilidad. Clase muy entretenida donde se lograrás obtener un elevado gasto calórico.',
      image: 'assets/class-cardio.jpg',
      link: '/classes/cardiobox',
    },
  ];

  // Ahora las membresías vienen del backend
  memberships: MembershipCard[] = [];
  loadingMemberships = false;
  membershipsError: string | null = null;

  constructor(
    private router: Router,
    private membershipCatalogService: MembershipCatalog,
  ) {}

  ngOnInit() {
    this.startAutoplay();
    this.loadMemberships();
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  // ================= CAROUSEL =================

  startAutoplay() {
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  nextSlide() {
    this.currentSlide.update((current) => (current + 1) % this.heroSlides.length);
  }

  prevSlide() {
    this.currentSlide.update((current) =>
      current === 0 ? this.heroSlides.length - 1 : current - 1,
    );
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
    this.stopAutoplay();
    this.startAutoplay();
  }

  // ================= MEMBRESÍAS =================

  private loadMemberships() {
    this.loadingMemberships = true;
    this.membershipsError = null;

    this.membershipCatalogService.getMemberships().subscribe({
      next: (data) => {
        this.memberships = data.map((api) => this.mapApiToCard(api));
        this.loadingMemberships = false;
      },
      error: (err) => {
        console.error('Error cargando membresías', err);
        this.membershipsError = 'No se pudieron cargar los planes. Intenta más tarde.';
        this.loadingMemberships = false;
      },
    });
  }

  private mapApiToCard(api: MembershipApi): MembershipCard {
    const durationLabel = this.getDurationLabel(api.durationMonths);
    const scopeLabel = this.getScopeLabel(api.scope);
    const usageLabel = this.getUsageLabel(
      api.isUsageLimited,
      api.maxDaysPerPeriod,
      api.periodUnit,
    );

    const features: string[] = [
      api.description,
      `Duración: ${durationLabel}`,
      `Alcance: ${scopeLabel}`,
      usageLabel,
    ];

    return {
      code: api.code,
      name: api.name,
      description: api.description,
      price: this.formatCLP(api.price),
      features,
      durationLabel,
      scopeLabel,
      // si quieres destacar alguno en particular:
      highlight: api.code === 'MULTICLUB_ANUAL',
    };
  }

  private getDurationLabel(months: number): string {
    if (months === 0) {
      return 'Periodo de prueba';
    }
    if (months === 1) {
      return '1 mes';
    }
    return `${months} meses`;
  }

  private getScopeLabel(scope: string): string {
    if (scope === 'MULTICLUB') {
      return 'Multiclub (todas las sedes)';
    }
    if (scope === 'ONECLUB') {
      return 'One Club (una sede)';
    }
    return scope;
  }

  private getUsageLabel(
    isUsageLimited: boolean,
    maxDaysPerPeriod: number | null,
    periodUnit: 'WEEK' | 'MONTH' | null,
  ): string {
    if (!isUsageLimited) {
      return 'Acceso ilimitado durante la vigencia del plan';
    }
    if (maxDaysPerPeriod && periodUnit === 'WEEK') {
      return `Hasta ${maxDaysPerPeriod} asistencias por semana`;
    }
    if (maxDaysPerPeriod && periodUnit) {
      return `Hasta ${maxDaysPerPeriod} asistencias por período`;
    }
    return 'Uso limitado según condiciones del plan';
  }

  private formatCLP(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  openRegisterWithMembership(membership: MembershipCard) {
    // Usamos el code real del backend, ej: "MULTICLUB_ANUAL"
    this.router.navigate(['/checkout'], {
      queryParams: { plan: membership.code },
    });
  }
}
