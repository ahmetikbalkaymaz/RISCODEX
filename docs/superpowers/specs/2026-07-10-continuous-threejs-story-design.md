# Riscodex Sürekli Three.js Hikâye Tasarımı

## Amaç

Mevcut hero karar ağını, sayfa boyunca devam eden tek bir Three.js sahnesine dönüştürmek. Sahne yalnızca dekoratif görünmemeli; Riscodex’in dağınık sigorta verisini kontrollü karar akışına dönüştürmesini her bölümde farklı bir görsel durumla anlatmalıdır.

## Görsel Tez

“Dağınık veriden kontrollü karara.” Beyaz ve füme kurumsal yüzey üzerinde lacivert çekirdekler, Riscodex mavisi bağlantılar ve sınırlı veri parçacıkları kullanılacak. Görünüm belirgin biçimde üç boyutlu olacak ancak neon, oyun arayüzü, uzay teması ve rastgele parçacık gürültüsü kullanılmayacak.

## Mimari

Tek bir sabit WebGL canvas sayfanın arka planında kalır. HTML içerik, navigasyon ve CTA’lar normal DOM akışında çalışmaya devam eder. JavaScript, görünür bölüm ve bölüm içi scroll ilerlemesinden tek bir global hikâye ilerlemesi üretir; kamera, düğümler, bağlantılar ve parçacıklar bu hedef değerlere yumuşak biçimde yaklaşır.

Mevcut `decision-network-core.mjs` saf scroll ve sahne durumu hesaplarını sağlar. `decision-network.js` tek renderer, tek kamera ve tekrar kullanılan geometrilerle tüm hikâyeyi yönetir. Yeni bir renderer veya canvas her bölümde oluşturulmaz.

## Bölüm Durumları

### 1. Hero — Karar Ağı

- Dört ana düğüm: Teklif, Karşılaştırma, Kontrol, Poliçe.
- Düğümler belirgin derinlik farklarıyla S-eğrisi oluşturur.
- Aktif bağlantıda veri parçacıkları ilerler.
- Fare hareketi düşük genlikli kamera parallax’ı sağlar.
- Scroll, kamerayı aşamalar arasında ilerletir.

### 2. Hakkımızda — Karar Çekirdeği

- Dört ana düğüm merkeze yaklaşır.
- Bağlantılar düzenli, konsantrik bir karar çekirdeğine dönüşür.
- Kamera merkeze hafif yaklaşır; kurumsal sistem ve standartlaşma hissi oluşur.

### 3. Ürünler — Modüler Ürün Sistemi

- Merkez çekirdeğin çevresinde ürün modüllerini temsil eden uydu düğümler açılır.
- TariffEQ, Versus AI ve Versus Check daha güçlü; yol haritası modülleri daha düşük kontrastlı görünür.
- Ürün kartları DOM olarak kalır; 3D etiket üretilmez.

### 4. Sorun — Kırık Akış

- Bağlantılar birbirinden uzaklaşır ve bazı yollar kesintili hale gelir.
- Parçacıklar farklı yönlere sapar; görünürlük kaybı, manuel işlem ve reaktif çalışma anlatılır.
- Kırılma kontrollüdür; sahne karmaşık parçacık patlamasına dönüşmez.

### 5. Çözümler — Yeniden Birleşme

- Dağılmış yollar üç kontrollü çözüm hattında yeniden birleşir.
- Şirket, broker ve endüstriyel risk çözümleri üç paralel akış olarak görünür.
- Kamera tekrar dengeli ve merkezi bir kompozisyona döner.

### 6. İşleyiş — Operasyon Koridoru

- Değerlendirme, Pilot ve Canlı Kullanım aşamaları derinlik boyunca üç kapı/düğüm oluşturur.
- Scroll sırasında kamera bu üç aşamadan kontrollü biçimde geçer.
- Kullanıcı scroll’u kilitlenmez; doğal belge akışı korunur.

### 7. Final CTA — Tek Karar Noktası

- Tüm çizgiler tek bir güçlü Riscodex düğümünde birleşir.
- Hareket sakinleşir ve CTA en yüksek görsel önceliği alır.
- Form alanlarının arkasında yoğun animasyon kullanılmaz.

## Hareket Sistemi

Üç ana hareket kullanılacak:

1. Scroll-bağlantılı kamera ve sahne durum geçişleri.
2. Bağlantılar üzerinde ilerleyen sınırlı veri parçacıkları.
3. Masaüstünde düşük genlikli pointer parallax ve düğüm nefes hareketi.

Durum geçişleri ani kesme yerine `damp`/interpolasyon ile yapılır. DOM bölümleri görünürlük kazandığında sahne hedefleri değişir; her frame geometri veya materyal oluşturulmaz.

## İçerik Katmanı

- Mevcut başlıklar, açıklamalar, ürün kartları ve CTA’lar korunur.
- Canvas `pointer-events: none` ve `aria-hidden="true"` kalır.
- Bölüm içerikleri sahneden ayrışmak için gerektiğinde yarı saydam beyaz atmosfer katmanı kullanır.
- 3D sahne metinlerin kontrastını veya tıklanabilir alanlarını azaltmaz.
- Türkçe ve İngilizce içerik geçişi mevcut sistemle çalışmaya devam eder.

## Responsive ve Performans

### Masaüstü

- Tam hikâye, pointer parallax ve en fazla 24 ikincil veri noktası.
- Pixel ratio en fazla 1.5.

### Tablet

- Kamera hareketi ve uydu düğüm sayısı azaltılır.
- En fazla 12 ikincil veri noktası.
- Pixel ratio en fazla 1.5.

### Mobil

- Kamera yolu sadeleşir; bölüm durumları temel dönüşüm ve vurgu ile anlatılır.
- Pointer parallax kapatılır.
- En fazla 6 ikincil veri noktası.
- Pixel ratio en fazla 1.25.

Tek renderer, paylaşılan geometriler ve materyaller kullanılır. Canvas görünümden tamamen çıktığında veya sekme görünür olmadığında animasyon duraklatılır. Post-processing, gerçek zamanlı gölge, texture, fizik ve model dosyası kullanılmaz.

## Erişilebilirlik ve Fallback

- `prefers-reduced-motion: reduce` durumunda kamera seyahati, parçacık akışı ve parallax durur; her bölüm için sakin bir sabit kompozisyon gösterilir.
- WebGL veya Three.js kullanılamazsa mevcut CSS karar ağı fallback’i hero’da görünür; alt bölümler normal HTML arka planıyla çalışır.
- Canvas klavye odağı almaz ve ekran okuyucu içeriği üretmez.
- Scroll kilidi ve zorunlu tam ekran deneyim kullanılmaz.

## Test ve Kabul Kriterleri

- Hero’dan CTA’ya kadar bölüm sırası doğru sahne durumlarına eşlenir.
- Kamera ve düğüm geçişlerinde ani sıçrama olmaz.
- Dört hero aşaması ve üç işleyiş aşaması doğru sırada vurgulanır.
- TR/EN geçişi mevcut içerik ve erişilebilir etiketlerde çalışır.
- 1280×720 ve 390×844 görünümde yatay taşma, metin çakışması veya tıklama engeli olmaz.
- Mobil pixel ratio ve veri noktası bütçeleri aşılmaz.
- Reduced-motion ve WebGL fallback senaryolarında içerik kullanılabilir kalır.
- Tarayıcı konsolunda Three.js kaynaklı hata bulunmaz.

## Kapsam Dışı

- Yeni metin, ürün veya sayfa bölümü eklemek.
- 3D model, ses, fizik, post-processing veya OrbitControls.
- Scroll kilidi, tam ekran sunum veya kullanıcı tarafından serbest kamera kontrolü.
- Hero dışındaki DOM düzenini yeniden tasarlamak.
