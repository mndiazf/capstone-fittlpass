import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';


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

interface Membership {
  id: string;
  name: string;
  badge?: string;
  discount: string;
  features: string[];
  price: string;
  monthlyPrice: string;
  totalPrice: string;
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

  constructor(private router: Router) {}

  heroSlides: HeroSlide[] = [
    {
      image: 'assets/Imagen1.png',
      title: 'Sé tu mejor versión',
      subtitle: 'Entrena con los mejores profesionales'
    },
    {
      image: 'assets/Imagen2.jpg',
      title: 'Alcanza tus metas',
      subtitle: 'Programas personalizados para ti'
    },
    {
      image: 'assets/Imagen3.jpg',
      title: 'Únete a nuestra comunidad',
      subtitle: 'Más de 500 miembros activos'
    }
  ];

  classes: ClassCard[] = [
    {
      id: 'yoga',
      title: 'Yoga',
      description: 'Te invitamos a nuestra clase de yoga, centrada en la armonía mente-cuerpo, en donde vas a explorar un viaje de autodescubrimiento y revitalización a través de las prácticas milenarias del yoga.',
      image: 'assets/class-yoga.jpg',
      link: '/classes/yoga'
    },
    {
      id: 'spinbike',
      title: 'Spinbike',
      description: 'Una clase que se realiza sobre una bicicleta estática al ritmo de la música, en la que se efectúa un trabajo cardiovascular de alta intensidad.',
      image: 'assets/class-spin.jpg',
      link: '/classes/spinbike'
    },
    {
      id: 'cardiobox',
      title: 'Cardio box',
      description: 'Ejercicios que combinan los golpes de box al ritmo de la música, trabajando resistencia, fuerza, coordinación y flexibilidad. Clase muy entretenida donde se lograrás obtener un elevado gasto calórico.',
      image: 'assets/class-cardio.jpg',
      link: '/classes/cardiobox'
    }
  ];

  memberships: Membership[] = [
    {
      id: 'anual-multiclub',
      name: 'Plan Anual MultiClub',
      badge: 'Matrícula GRATIS',
      discount: '60% OFF',
      features: [
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso a todas las sucursales'
      ],
      price: '$176.000',
      monthlyPrice: '$14.667',
      totalPrice: 'Valor total $176.000',
      highlight: true
    },
    {
      id: 'anual-oneclub',
      name: 'Plan Anual OneClub',
      badge: 'Matrícula GRATIS',
      discount: '60% OFF',
      features: [
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso exclusivo a la sucursal donde se contrató'
      ],
      price: '$168.000',
      monthlyPrice: '$14.000',
      totalPrice: 'Valor total $168.000'
    },
    {
      id: 'mensual-cargo',
      name: 'Plan Mensual Cargo Automático',
      badge: 'Matrícula GRATIS',
      discount: '40% OFF',
      features: [
        'Congelamiento* (pausar membresía en caso necesario)',
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso a todas las sucursales'
      ],
      price: '$21.000',
      monthlyPrice: '$21.000',
      totalPrice: ''
    }
  ];

  openRegisterWithMembership(membership: Membership) {
    this.router.navigate(['/checkout'], {
      queryParams: { plan: membership.id }
    });
  }

  ngOnInit() {
    this.startAutoplay();
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

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
    this.currentSlide.update(current => 
      (current + 1) % this.heroSlides.length
    );
  }

  prevSlide() {
    this.currentSlide.update(current => 
      current === 0 ? this.heroSlides.length - 1 : current - 1
    );
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
    this.stopAutoplay();
    this.startAutoplay();
  }
}