# Riscodex Three.js Karar Ağı Tasarımı

## Amaç

Riscodex tanıtım sayfasının hero alanındaki mevcut statik “Decision OS” panelini, sigorta karar sürecini mekânsal olarak anlatan kontrollü bir Three.js deneyimine dönüştürmek. Görsel; Riscodex’in teklif, karşılaştırma, kontrol ve poliçe aşamalarını tek bir karar standardında birleştirdiğini ilk ekranda anlatmalıdır.

Başarı ölçütleri:

- İlk bakışta kurumsal, güvenilir ve teknolojik bir ürün algısı oluşturmak.
- Dört aşamalı karar akışını metin okumadan da anlaşılır kılmak.
- Hero başlığı, açıklaması ve CTA’larının okunabilirliğini korumak.
- Masaüstünde akıcı, mobilde sade ve erişilebilir bir deneyim sunmak.
- WebGL kullanılamadığında sayfayı bozmadan statik bir alternatif göstermek.

## Görsel Tez

“Kurumsal bir karar sistemi, karanlık bir teknoloji gösterisi değil.” Sahne; beyaz, füme, lacivert ve mevcut Riscodex mavisiyle, yarı saydam teknik yüzeyler ve ince bağlantı çizgileri kullanacak. Neon, yoğun parçacık, oyun arayüzü ve rastgele dönen soyut şekiller kullanılmayacak.

## İçerik Planı

Mevcut sayfa yapısı korunur:

1. Hero: Solda mevcut marka mesajı ve CTA’lar, sağda 3D karar ağı.
2. Destek bölümleri: Mevcut metrikler ve ürün anlatımı değişmeden devam eder.
3. Detay: Platform, sorun, çözüm ve işleyiş bölümleri mevcut içerik sırasını korur.
4. Son CTA: Mevcut erişim talebi alanı korunur.

Bu çalışma yalnızca hero’daki görsel anlatımı ve onunla ilişkili hareket davranışını değiştirir. Sayfanın diğer bölümlerinin içerik veya düzen açısından yeniden tasarlanması kapsam dışıdır.

## Etkileşim Tezi

Deneyim üç kontrollü hareketten oluşur:

1. Hero girişinde dört düğüm ve bağlantılar sırayla belirir.
2. Kullanıcı hero boyunca kaydırdıkça aktif aşama `Teklif → Karşılaştırma → Kontrol → Poliçe` sırasıyla değişir; kamera aktif düğüme çok hafif yaklaşır.
3. Masaüstünde imleç konumu sahneye düşük genlikli perspektif/parallax uygular. Düğümler sürüklenmez ve kullanıcı tarafından serbestçe döndürülmez.

Hareket hızı sakin ve kurumsal kalır. Scroll animasyonu sayfanın doğal kaymasını engellemez; scroll kilidi veya tam ekran zorunlu sahne kullanılmaz.

## Hero Kompozisyonu

Hero iki görsel katmandan oluşur:

- İçerik katmanı: Mevcut başlık, açıklama ve CTA’lar solda kalır ve DOM içinde erişilebilir olmaya devam eder.
- 3D katman: Sağ tarafta, mevcut `.brand-hero-visual` alanının içinde bir canvas bulunur.

Masaüstünde sahne hero’nun yaklaşık sağ yüzde 52’sini kullanır. Sol metin alanına yaklaşan kenarda beyaz bir atmosfer/fog geçişi uygulanarak metin kontrastı korunur. Canvas dekoratif anlatım olarak `aria-hidden="true"` kalır; süreç adları ve durum bilgisi erişilebilir bir DOM etiketi katmanında da bulunur.

## 3D Sahne

### Ana Düğümler

Dört ana düğüm bulunur:

- Teklif
- Karşılaştırma
- Kontrol
- Poliçe

Düğümler soldan sağa düz bir çizgi üzerinde değil, kontrollü bir S-eğrisi boyunca farklı derinliklerde yerleştirilir. Böylece sahne 3D hissi verirken akış yönü kaybolmaz.

Her düğüm şu katmanlardan oluşur:

- Füme/lacivert merkez gövde.
- İnce mavi kenar veya aktif durumda ışık halkası.
- Aktif aşamada büyüyen, düşük opaklıklı çevresel halo.
- DOM tabanlı aşama adı ve kısa durum etiketi.

### Bağlantılar ve Veri Akışı

Düğümler ince, düşük kontrastlı eğrilerle bağlanır. Aktif bağlantı üzerinde sınırlı sayıda küçük veri işareti bir sonraki düğüme ilerler. Aynı anda yalnızca bir bağlantı vurgulanır; arka plan bağlantıları sakin kalır.

Arka planda en fazla 12 küçük ikincil nokta bulunur. Bunlar ürün verisini veya karar girdilerini çağrıştırır ancak okunabilirliği bozacak bir parçacık alanına dönüşmez.

### Kamera ve Işık

- Perspektif kamera sabit bir ana açıdan başlar.
- Scroll ilerlemesi hedef kamera konumu ve bakış noktasını yumuşak interpolasyonla değiştirir.
- Kamera dönüşleri düşük genliklidir; sahne hiçbir zaman baş aşağı veya aşırı perspektifli görünmez.
- Ortam ışığı ana görünürlüğü sağlar; soğuk mavi yönlü ışık sadece aktif düğümün ayrışmasını destekler.
- Gölge haritası kullanılmaz. Derinlik hissi malzeme, ton farkı ve hafif post-process gerektirmeyen halo geometrisiyle sağlanır.

## Scroll Davranışı

Hero içindeki normal scroll ilerlemesi 0–1 aralığına normalize edilir. Bu değer dört aşamaya bölünür:

- 0.00–0.24: Teklif
- 0.25–0.49: Karşılaştırma
- 0.50–0.74: Kontrol
- 0.75–1.00: Poliçe

Aktif aşama değiştiğinde düğüm vurgusu, kamera hedefi, bağlantı vurgusu ve DOM durum etiketi birlikte güncellenir. Animasyonlar `requestAnimationFrame` döngüsünde interpolasyonla ilerler; scroll olayında ağır render veya geometri üretimi yapılmaz.

Hero alanı sticky bir anlatı ekranına çevrilmez. Kullanıcı mevcut sayfa akışında normal biçimde aşağı kayar; 3D sahne hero görünürken tepki verir ve görünüm dışına çıktığında render döngüsü duraklatılır.

## Bileşen ve Dosya Sınırları

Proje mevcut statik HTML yapısını korur. Uygulama şu birimlere ayrılır:

- `index.html`: Canvas kabı, erişilebilir DOM etiketleri ve gerekli script bağlantıları.
- `js/decision-network.js`: Three.js sahnesi, düğüm üretimi, bağlantılar, kamera, resize, scroll ve yaşam döngüsü.
- Mevcut stil bloğu: Hero canvas, etiketler, fallback ve responsive kurallar.

`decision-network.js` dış dünyaya yalnızca başlatma ve yok etme yaşam döngüsü üzerinden bağlı kalır. Mevcut dil değiştirme, navigasyon, metrik ve reveal koduna karışmaz.

Three.js, mevcut projenin build sistemi olmaması nedeniyle sürümü sabitlenmiş bir CDN ESM import map veya sabit sürümlü modül URL’si ile yüklenir. Sürüm numarası açıkça sabitlenir; `latest` kullanılmaz.

## Durum ve Veri Akışı

1. DOM hazır olduğunda hero ve canvas kabı bulunur.
2. WebGL ve hareket tercihi kontrol edilir.
3. Uygun cihazda sahne bir kez oluşturulur.
4. ResizeObserver canvas ölçülerini günceller.
5. Hero görünürlüğü IntersectionObserver ile izlenir.
6. Görünürken scroll ilerlemesi aktif aşamayı belirler.
7. Render döngüsü hedef kamera ve malzeme değerlerini yumuşatır.
8. Görünüm dışındayken animasyon döngüsü durur; yeniden görünür olduğunda devam eder.

## Responsive Tasarım

### Masaüstü

- Dört düğüm, bağlantılar, ikincil noktalar ve hafif imleç parallax’ı gösterilir.
- Etiketler aktif aşamaya göre görünürlük ve vurgu kazanır.

### Tablet

- Düğüm yerleşimi sıkıştırılır.
- İkincil noktaların yarısı kaldırılır.
- Parallax genliği azaltılır.

### Mobil

- Sahne mevcut hero’nun alt/arka görsel alanına yerleşir.
- Kamera sabitlenir; scroll yalnızca aktif düğüm ve bağlantı vurgusunu değiştirir.
- İkincil noktalar kaldırılır ve pixel ratio en fazla 1.25 ile sınırlandırılır.
- Etiketler kısaltılmaz; üst üste binmemeleri için tek aktif etiket görünür.

## Performans Bütçesi

- Pixel ratio masaüstünde en fazla 1.5, mobilde 1.25.
- Dört ana mesh ve en fazla 12 ikincil nokta.
- Materyaller ve geometriler paylaşılır; her karede yeni nesne oluşturulmaz.
- Post-processing, gerçek zamanlı gölge, fizik motoru ve yüksek çözünürlüklü texture kullanılmaz.
- Hero görünüm dışındayken `requestAnimationFrame` durdurulur.
- Resize işlemleri ölçü değiştiğinde ve throttle edilmiş biçimde uygulanır.

## Erişilebilirlik ve Fallback

- `prefers-reduced-motion: reduce` durumunda kamera, veri akışı ve parallax kapatılır; sahne sabit ilk kompozisyonu gösterir.
- WebGL desteklenmiyorsa veya Three.js yüklenemezse canvas gizlenir ve CSS ile hazırlanmış statik karar ağı görünür.
- Canvas klavye odağı almaz ve CTA’ların tıklanmasını engellemez.
- Aşama adları görsel canvas dışında DOM metni olarak bulunur.
- Kontrast, mevcut hero metni ve düğüm etiketleri için WCAG AA hedefini korur.

## Hata Yönetimi

- Sahne başlatma işlemi `try/catch` ile çevrelenir.
- Başlatma hatası kullanıcıya konsol gürültüsü dışında görünür bir hata mesajı çıkarmaz; statik fallback etkinleşir.
- Canvas boyutu sıfırsa render başlatılmaz ve bir sonraki geçerli resize beklenir.
- WebGL context kaybında animasyon durdurulur ve fallback gösterilir.
- Context geri gelse bile sayfa boyunca otomatik karmaşık yeniden kurulum yapılmaz; güvenli statik durum korunur.

## Test ve Doğrulama

### İşlevsel

- Dört scroll aşamasının doğru sırayla aktifleşmesi.
- Hero görünüm dışına çıktığında render döngüsünün durması.
- Resize sonrası aspect ratio ve canvas ölçülerinin doğru kalması.
- Dil değiştirme, mobil menü, CTA’lar ve mevcut reveal animasyonlarının bozulmaması.

### Görsel

- Yaygın masaüstü, tablet ve mobil viewport’larda metin/canvas çakışmasının olmaması.
- Aktif düğümün her aşamada belirgin, pasif düğümlerin sakin olması.
- Hero başlığı ve CTA’ların sahneden daha yüksek görsel öncelik taşıması.
- Mobilde tek aktif etiket görünmesi.

### Erişilebilirlik ve Dayanıklılık

- Reduced-motion emülasyonunda hareketin durması.
- WebGL devre dışı senaryosunda fallback’in görünmesi.
- Klavye navigasyonunda canvas’ın odağa girmemesi.
- Tarayıcı konsolunda başlangıç, resize ve scroll sırasında hata olmaması.

## Kapsam Dışı

- Hero dışındaki bölümleri 3D’ye dönüştürmek.
- Kullanıcı tarafından serbest döndürülen OrbitControls deneyimi.
- 3D model dosyaları, fizik simülasyonu veya ses.
- Tam ekran scroll kilidi veya uzun sticky hikâye.
- Yeni backend, veri kaynağı ya da analitik entegrasyonu.
