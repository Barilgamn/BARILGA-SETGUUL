import { Magazine } from '../types';

export const MOCK_MAGAZINES: Magazine[] = [
  {
    id: 'mag-156',
    title: 'Барилга.МН - 2024 оны 3-р сар',
    issueNumber: '№ 156',
    description: 'Монголын барилгын салбарын тэргүүлэх сэтгүүл: Шинэ ногоон барилгын чиг хандлага, эрчим хүчний хэмнэлттэй архитектур, БНбД норм дүрэм, зах зээлийн үнэ ханшийн цогц судалгаа.',
    coverImage: '/src/assets/images/arch_magazine_cover_modern_1790587193921.jpg',
    pricePrint: 15000,
    priceDigital: 8000,
    publishedDate: new Date('2024-03-01').getTime(),
    format: 'both',
    heyzineLink: 'https://heyzine.com/api1',
    category: 'magazine'
  },
  {
    id: 'mag-155',
    title: 'Барилга.МН - 2024 оны 2-р сар',
    issueNumber: '№ 155',
    description: 'Орчин үеийн интерьер архитектур, байгалийн гэрэлтүүлгийн төлөвлөлт, шинэ орон сууцны үнийн хэлбэлзэл ба барилгын хийц угсралтын технологийн шинэчлэл.',
    coverImage: '/src/assets/images/arch_magazine_interior_design_1790587205564.jpg',
    pricePrint: 15000,
    priceDigital: 8000,
    publishedDate: new Date('2024-02-01').getTime(),
    format: 'both',
    heyzineLink: 'https://heyzine.com/api2',
    category: 'magazine'
  },
  {
    id: 'mag-154',
    title: 'Барилга.МН - 2024 оны 1-р сар',
    issueNumber: '№ 154',
    description: 'Хотын тогтвортой хөгжил ба өндөр барилгын шийдлүүд: 2024 оны салбарын төсөл хөтөлбөрүүдийн тойм, инженерийн дэд бүтэц, төсөвт өртгийн тооцоолол.',
    coverImage: '/src/assets/images/arch_magazine_urban_tower_1790587224243.jpg',
    pricePrint: 15000,
    priceDigital: 8000,
    publishedDate: new Date('2024-01-01').getTime(),
    format: 'both',
    heyzineLink: 'https://heyzine.com/api3',
    category: 'book'
  }
];
