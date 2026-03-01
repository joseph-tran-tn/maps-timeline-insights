# Kịch bản kiểm thử — Map Timeline (Google Takeout + Mapbox)

Tài liệu mô tả các kịch bản test cho ứng dụng Map Timeline, bám theo [kế hoạch phát triển](../.cursor/plans/map_timeline_development_60780cbe.plan.md).

---

## 1. Upload dữ liệu từ Google Takeout (Tính năng 1)

### 1.1 Upload file Records.json hợp lệ

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| U-1.1 | Upload file JSON đúng format Google Takeout | 1. Mở app, vào màn upload<br>2. Chọn file `Records.json` có `locations[]` với `timestamp`, `latitudeE7`, `longitudeE7`, `accuracy`<br>3. Xác nhận upload | Parse thành công; hiển thị thông báo số điểm + khoảng ngày; data xuất hiện trong store và sẵn sàng hiển thị map/timeline |
| U-1.2 | Upload file có placeId | 1. Chọn file Records.json có một số record chứa `placeId`<br>2. Upload | Các điểm có `placeId` được giữ; lat/lng = E7/1e7; timestamp chuẩn ISO/ms |
| U-1.3 | Upload file rỗng (locations = []) | 1. Upload file JSON có `locations: []` | Thông báo “0 điểm” hoặc tương đương; không crash; map trống |
| U-1.4 | Upload file có record thiếu timestamp | 1. Upload file có record thiếu `timestamp` | Record đó bị bỏ qua; các record đủ field vẫn được parse |
| U-1.5 | Upload file có record thiếu tọa độ | 1. Upload file có record thiếu `latitudeE7` hoặc `longitudeE7` | Record đó bị bỏ qua; không crash |

### 1.2 Upload file ZIP (Takeout)

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| U-2.1 | Upload ZIP chứa Location History/Records.json | 1. Chọn file .zip Takeout<br>2. App tìm `Location History/Records.json` hoặc tương đương trong ZIP | Tìm thấy, parse như U-1.1; thông báo thành công |
| U-2.2 | Upload ZIP không chứa Records.json | 1. Chọn file .zip không có path Records.json | Thông báo lỗi rõ ràng (vd. “Không tìm thấy Records.json”); không crash |
| U-2.3 | Upload file không phải JSON/ZIP | 1. Chọn file .txt / .pdf / .csv | Validation từ chối hoặc thông báo lỗi; không parse |

### 1.3 File lớn & hiệu năng

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| U-3.1 | Upload Records.json rất lớn (vd. 100MB+) | 1. Upload file rất nặng | UI không block lâu (stream/worker nếu có); có progress hoặc thông báo đang xử lý; cuối cùng parse xong hoặc thông báo lỗi |
| U-3.2 | Upload nhiều lần (nhiều dataset) | 1. Upload file A<br>2. Upload file B | Cả hai dataset tồn tại trong store; có thể phân biệt (tên, sourceId) và dùng cho merge |

---

## 2. Chỉnh sửa điểm / route bất hợp lý (Tính năng 2)

### 2.1 Phát hiện bất hợp lý

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| E-1.1 | Outlier khoảng cách | 1. Load data có hai điểm liên tiếp (theo time) cách nhau > 50–100 km trong thời gian rất ngắn | Đoạn/điểm được đánh dấu “có thể sai” (outlier); hiển thị trên map/danh sách (style khác hoặc badge) |
| E-1.2 | Điểm accuracy kém | 1. Load data có điểm `accuracy` > ngưỡng (vd. 500 m) | Điểm được đánh dấu để xem xét (có thể lọc “chỉ bất thường”) |
| E-1.3 | Không đánh dấu nhầm | 1. Load data bình thường (không outlier, accuracy ổn) | Không điểm nào bị đánh dấu bất thường |

### 2.2 Thao tác chỉnh sửa (Context + UI)

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| E-2.1 | Xóa điểm | 1. Click điểm trên map → mở popup/panel<br>2. Bấm “Xóa” | Điểm biến mất khỏi store và map; route cập nhật (không nối qua điểm đã xóa) |
| E-2.2 | Sửa tọa độ (nhập số) | 1. Mở panel điểm<br>2. Nhập lat/lng mới<br>3. Lưu | Điểm cập nhật trên map và trong store; khoảng cách tới điểm trước/sau thay đổi hợp lý |
| E-2.3 | Sửa tọa độ (kéo marker) | 1. Bật chế độ sửa / drag marker<br>2. Kéo marker đến vị trí mới<br>3. Thả | Tọa độ trong store cập nhật; route vẽ lại đúng |
| E-2.4 | Popup/panel hiển thị đủ thông tin | 1. Click điểm có đủ dữ liệu | Hiển thị: thời gian, accuracy, khoảng cách tới điểm trước/sau; nếu có placeId và cache: tên/địa chỉ địa điểm |
| E-2.5 | Lọc “chỉ bất thường” trong danh sách | 1. Bật filter “Điểm bất thường”<br>2. Chọn một điểm trong danh sách | Map highlight điểm đó; mở panel sửa tương ứng |
| E-2.6 | Ẩn/hiện đoạn bất thường trên route | 1. Bật tùy chọn ẩn đoạn bất thường | Đoạn outlier đổi style hoặc ẩn; dễ quyết định xóa/sửa |

---

## 3. Merge nhiều dữ liệu (Tính năng 3)

### 3.1 Model và logic merge

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| M-1.1 | Merge hai dataset | 1. Upload dataset A<br>2. Upload dataset B<br>3. Chọn “Merge đã chọn” hoặc “Merge tất cả” | Một timeline thống nhất; sort theo `timestamp`; mỗi điểm giữ `sourceId` |
| M-1.2 | Thứ tự sau merge | 1. Merge A (điểm 10:00, 12:00) và B (điểm 11:00) | Thứ tự hiển thị: 10:00 (A), 11:00 (B), 12:00 (A) |
| M-1.3 | Metadata merge | 1. Merge xong | Hiển thị số điểm từng nguồn, khoảng ngày tổng hợp (min/max timestamp) |
| M-1.4 | Dedup (nếu có) | 1. Merge hai dataset có điểm cùng sourceId và thời gian rất gần | Theo logic đã định: có thể gộp một hoặc giữ cả hai tùy spec |

### 3.2 UI merge

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| M-2.1 | Danh sách dataset | 1. Đã upload 2+ file | Danh sách hiển thị: tên, số điểm, khoảng ngày; checkbox bật/tắt từng dataset |
| M-2.2 | Bật/tắt dataset khi xem | 1. Tắt checkbox dataset B | Map/timeline chỉ hiển thị dataset A (hoặc merged không có B nếu đang xem merged) |
| M-2.3 | Màu theo nguồn | 1. Xem merged view | Route/points tô màu theo `sourceId` (gradient hoặc segment màu) hoặc layer riêng bật/tắt |
| M-2.4 | Merge khi chỉ có 1 dataset | 1. Chỉ upload 1 file<br>2. Bấm Merge | Vẫn tạo “merged” view với một nguồn; không lỗi |

---

## 4. Mapbox & Timeline (Tính năng 4)

### 4.1 Khởi tạo map

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| MAP-1.1 | Map load với token | 1. Mở app (có `VITE_MAPBOX_TOKEN`) | Map Mapbox hiển thị; style map tối (theo plan); không lỗi console |
| MAP-1.2 | Thiếu token | 1. Mở app không set token | Thông báo rõ (vd. cần cấu hình token); không crash |

### 4.2 Nguồn dữ liệu và layer

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| MAP-2.1 | Points và line từ data | 1. Có data trong store<br>2. Xem map | Points (circle/symbol) và route (line) vẽ đúng từ GeoJSON (FeatureCollection Point, LineString) |
| MAP-2.2 | Data rỗng | 1. Chưa upload hoặc dataset rỗng | Map không vẽ points/line; không lỗi |
| MAP-2.3 | Cập nhật khi store thay đổi | 1. Xóa/sửa điểm hoặc thêm dataset | Map cập nhật ngay (re-render layer/source) |

### 4.3 Timeline slider

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| MAP-3.1 | Slider theo thời gian | 1. Có data<br>2. Kéo slider (min = ts đầu, max = ts cuối) | Chỉ points/line trong khoảng thời gian được hiển thị (filter hoặc setData) |
| MAP-3.2 | Label thời gian | 1. Kéo slider | Label hiển thị ngày/giờ tương ứng vị trí slider |
| MAP-3.3 | Slider khi chưa có data | 1. Chưa upload | Slider disabled hoặc ẩn; không lỗi |

### 4.4 Tương tác

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| MAP-4.1 | Click point → popup | 1. Click một điểm trên map | Popup hiện: thời gian, accuracy; nếu có placeId + cache: tên/địa chỉ; có nút “Sửa” mở panel |
| MAP-4.2 | Fit to route | 1. Bấm “Fit to route” / “Re-centre” | Map fit bounds (Turf `bbox`) để chứa toàn bộ route/points |
| MAP-4.3 | Zoom/pan | 1. Zoom, kéo map | Hoạt động bình thường; không ảnh hưởng data |

---

## 5. Google Places API & cache (placeId)

### 5.1 Đọc/ghi cache

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| P-1.1 | Load cache khi khởi động | 1. Có file `public/TimelinePlaceCache.json` (hoặc user chọn file)<br>2. Mở app | Cache load vào memory; không gọi API cho placeId đã có trong cache |
| P-1.2 | Không có file cache | 1. Không có file cache / không upload | Cache = {}; khi cần placeId sẽ gọi API hoặc hiện “Lấy thông tin” |
| P-1.3 | Ghi cache sau khi gọi API | 1. Điểm có placeId chưa có trong cache<br>2. User bấm “Lấy thông tin” → gọi Place Details thành công | Cache trong memory cập nhật; persist (download JSON hoặc localStorage); lần sau không gọi lại |

### 5.2 API & UI

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| P-2.1 | Hiển thị từ cache | 1. Click điểm có placeId đã nằm trong cache | Popup/panel hiện `displayName`, `formattedAddress` (và có thể icon, types) từ cache |
| P-2.2 | Nút “Lấy thông tin” khi chưa cache | 1. Click điểm có placeId chưa trong cache | Có nút “Lấy thông tin”; bấm → gọi API → cập nhật cache + UI |
| P-2.3 | API key thiếu/sai | 1. Gọi Place Details khi key sai hoặc thiếu | Thông báo lỗi rõ (vd. API key); không crash |
| P-2.4 | Định dạng cache đúng | 1. So sánh entry cache sau khi gọi API | Có đủ: id, resourceName, displayName, formattedAddress, location (lat/lng), (svgIconMaskURI, iconBackgroundColor, googleMapsURI, types) theo format TimelinePlaceCache.json |

### 5.3 Quản lý cache (nếu có màn)

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| P-3.1 | Export cache | 1. Vào màn quản lý cache<br>2. Bấm Export | Tải file JSON cache (format đúng) |
| P-3.2 | Import cache | 1. Upload file cache JSON | Cache merge/ghi đè theo spec; placeId từ file có trong cache |

---

## 6. Giao diện & layout (tham chiếu screenshots)

### 6.1 Chung

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| UI-1.1 | Dark theme, layout sidebar + map | 1. Mở bất kỳ màn nào | Dark theme; sidebar trái (danh sách/lọc); map bên phải chiếm phần lớn |
| UI-1.2 | Header | 1. Xem header | Có: back, tiêu đề “Timeline”, icon upload/đồng bộ, menu (3 chấm) |
| UI-1.3 | Tab điều hướng | 1. Xem tab | Day \| Trips \| Insights \| Places \| Cities \| World (theo screenshots) |

### 6.2 Tab Day (khi đã có data)

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| UI-2.1 | Chọn ngày | 1. Dùng mũi tên trái/phải hoặc calendar | Đổi ngày; calendar có chấm xanh ngày có dữ liệu |
| UI-2.2 | Tóm tắt ngày | 1. Chọn một ngày có data | Hiển thị km, thời gian theo loại (nếu có); “X visits” |
| UI-2.3 | Danh sách theo thời gian | 1. Xem danh sách | Mỗi mục: icon, loại, địa chỉ (rút gọn), khoảng thời gian; icon “...” mở menu (Edit day, Add visit, Add note, Delete day) |
| UI-2.4 | Nút Re-centre | 1. Bấm Re-centre góc dưới phải map | Map fit bounds route/points ngày đó |

### 6.3 Các tab khác (Trips, Insights, Places, Cities, World)

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| UI-3.1 | Nội dung theo tab | 1. Chuyển từng tab | Nội dung và layout khớp mô tả trong plan (số trips/days, danh sách chuyến, insights theo tháng, lưới Places, Cities, World) |
| UI-3.2 | Map tương ứng | 1. Ở mỗi tab có map | Marker/layer phù hợp (vd. toàn cầu cho Trips, marker đỏ Places, v.v.) |

---

## 7. Edge cases & lỗi

| ID | Mô tả | Bước | Kết quả mong đợi |
|----|--------|------|------------------|
| EC-1 | JSON lỗi cú pháp | 1. Upload file .json không phải JSON hợp lệ | Thông báo lỗi parse; không crash |
| EC-2 | JSON không có `locations` | 1. Upload JSON có cấu trúc khác (không có locations) | Thông báo lỗi (vd. “Định dạng không hợp lệ”); không crash |
| EC-3 | Tọa độ ngoài phạm vi | 1. Record có lat/lng ngoài -90/90, -180/180 | Bỏ qua hoặc clamp theo quy ước; không vẽ lệch vô hạn |
| EC-4 | Timestamp không hợp lệ | 1. Record có timestamp không parse được | Record bị bỏ qua; log nếu cần |
| EC-5 | Mạng lỗi khi gọi Places API | 1. Bấm “Lấy thông tin” khi mạng lỗi / API lỗi | Thông báo lỗi; có thể thử lại |
| EC-6 | Merge 0 dataset | 1. Bấm Merge khi chưa upload gì | Không crash; thông báo hoặc disable nút Merge |

---

## 8. Kiểm thử phi chức năng (gợi ý)

| ID | Mô tả | Cách kiểm tra |
|----|--------|----------------|
| NF-1 | Hiệu năng với dataset lớn | Upload 50k–100k điểm; đo thời gian parse, thời gian render map, độ mượt slider |
| NF-2 | Không block UI khi parse | Upload file lớn; trong lúc parse vẫn scroll/click được (hoặc có progress) |
| NF-3 | Token không lộ | Kiểm tra build/source không chứa `VITE_MAPBOX_TOKEN` / `VITE_GOOGLE_PLACES_API_KEY` dạng plain text |
| NF-4 | Responsive (nếu hỗ trợ) | Thu nhỏ màn hình; sidebar/map/tabs hiển thị đúng hoặc có collapse |

---

## Ma trận phủ (tóm tắt)

| Nhóm | Số kịch bản | Mức độ ưu tiên |
|------|-------------|----------------|
| Upload (1) | 12 | Cao |
| Chỉnh sửa (2) | 9 | Cao |
| Merge (3) | 8 | Trung bình |
| Mapbox & Timeline (4) | 11 | Cao |
| Places & cache (5) | 9 | Trung bình |
| UI/Layout (6) | 7 | Trung bình |
| Edge cases (7) | 6 | Cao |
| Phi chức năng (8) | 4 | Trung bình |

Tổng: **66 kịch bản** (có thể tách thêm test case tự động từ các bước trên).

---

*Tài liệu này dùng để test thủ công và làm cơ sở cho automation (e2e/unit). Cập nhật khi thêm tính năng hoặc đổi spec.*
