/* =====================================================================
   NỘI DUNG KHẢO SÁT — muốn sửa chữ, câu hỏi, lựa chọn, gợi ý: sửa ở file này.
   Xem README.md để biết cách sửa an toàn.

   Mỗi câu hỏi có:
     ma        Mã câu (A1, B2…). Đây cũng là tên cột trong Google Sheets.
               ĐỪNG đổi mã sau khi đã có người trả lời.
     loai      "chon1"      chọn 1 đáp án
               "chonNhieu"  chọn nhiều (thêm toiDa: 3 để giới hạn)
               "thang5"     thang 1–5
               "traLoiNgan" ô gõ chữ
               "email"      ô email (không bắt buộc)
     tieuDe    Nội dung câu hỏi.
     luaChon   Danh sách đáp án. Đáp án nào có chữ "(ghi rõ)" sẽ tự hiện ô gõ thêm.

   Rẽ nhánh:
     anKhi:      { cau: "B6", la: ["0"] }          → ẩn câu này nếu B6 chọn "0"
     chiHienKhi: { cau: "D1", la: ["Đã từng"] }    → chỉ hiện nếu D1 chọn "Đã từng"

   Câu gõ chữ có moiLuaChonMotO: "C9" sẽ hiện một ô cho mỗi lựa chọn đã tick ở C9.
   ===================================================================== */

// Danh sách vị trí, dùng chung cho B2 và C9. Sửa ở đây là đổi cả hai câu.
const DS_VI_TRI = [
  "Môi giới/kinh doanh", "Nghiên cứu thị trường", "Thẩm định giá", "Phát triển dự án", "Phân tích đầu tư",
  "Quản lý dự án", "Quản lý vận hành tài sản/tòa nhà", "Marketing BĐS", "Pháp lý dự án",
  "Phát triển mặt bằng cho chuỗi bán lẻ (site developer)", "Khác (ghi rõ)",
];

window.SURVEY = {
  tieuDe: "Hành trình định hướng nghề nghiệp ngành BĐS",
  thoiGian: "7–10 phút",

  loiMoDau: {
    chao: "Chào bạn! Khảo sát này tìm hiểu những khó khăn sinh viên gặp khi định hướng nghề nghiệp trong ngành Bất động sản. Kết quả sẽ được dùng để xây dựng chuỗi nội dung chia sẻ từ các anh chị đang làm trong ngành, giúp các bạn khóa sau có thông tin thực tế hơn.",
    gachDau: [
      "Thời gian: khoảng 7–10 phút.",
      "Khảo sát hoàn toàn ẩn danh. Email ở cuối là không bắt buộc.",
      "Không có câu trả lời đúng hay sai. Hãy trả lời theo đúng trải nghiệm của bạn.",
      "Câu nào không áp dụng với bạn, bạn có thể bỏ qua.",
    ],
    thangDiem: "Thang điểm dùng chung cho các câu đánh giá: 1 = Hoàn toàn không đồng ý · 2 = Không đồng ý · 3 = Trung lập · 4 = Đồng ý · 5 = Hoàn toàn đồng ý.",
  },

  // Nhãn của 5 mức trong câu thang 1–5
  thangDiem: ["Hoàn toàn không đồng ý", "Không đồng ý", "Trung lập", "Đồng ý", "Hoàn toàn đồng ý"],

  // Tên 3 giai đoạn trên thanh tiến trình
  cacGiaiDoan: { 1: "Hiểu ngành", 2: "Chọn hướng", 3: "Apply và đi làm" },

  loiCamOn: "Cảm ơn bạn đã dành thời gian!",
  loiMoiChiaSe: "Mình đang làm một khảo sát ngắn (7–10 phút) về định hướng nghề nghiệp ngành BĐS. Bạn làm giúp mình nhé!",

  cacPhan: [
    {
      ma: "A",
      ten: "Phần A – Thông tin chung",
      nhan: "Bắt đầu",
      giaiDoan: 1, // nằm trong đoạn đầu của thanh tiến trình
      moTa: "Phần này dùng để chia kết quả theo năm học và hoàn cảnh, không dùng để nhận diện người trả lời.",
      cauHoi: [
        { ma: "A1", loai: "chon1", tieuDe: "Bạn đang là sinh viên năm mấy?",
          luaChon: ["Năm 1", "Năm 2", "Năm 3", "Năm 4", "Đã tốt nghiệp (dưới 2 năm)"] },
        { ma: "A2", loai: "chon1", tieuDe: "Bạn học ngành/chương trình nào?",
          luaChon: ["Bất động sản – UEH", "Ngành khác – UEH (ghi rõ)", "Trường khác (ghi rõ)"] },
        { ma: "A3", loai: "chon1", tieuDe: "Chuyên ngành bạn đã chọn?",
          luaChon: ["Phát triển BĐS", "Đầu tư tài chính BĐS", "Chưa chọn", "Không áp dụng"] },
        { ma: "A4", loai: "chon1", tieuDe: "Bạn đến từ đâu?",
          luaChon: ["TP.HCM", "Tỉnh/thành khác"] },
        { ma: "A5", loai: "chon1", tieuDe: "Sau khi tốt nghiệp, bạn muốn làm việc ở đâu?",
          luaChon: ["TP.HCM", "Hà Nội hoặc đô thị lớn khác", "Về quê", "Chưa biết"] },
        { ma: "A6", loai: "chon1", tieuDe: "Bạn đã từng thực tập hoặc làm việc trong ngành BĐS chưa?",
          luaChon: ["Chưa", "Đang thực tập/làm việc", "Đã từng"] },
      ],
    },

    {
      ma: "B",
      ten: "Phần B – Giai đoạn 1: Hiểu biết về ngành",
      nhan: "Giai đoạn 1",
      giaiDoan: 1,
      cauHoi: [
        { ma: "B1", loai: "traLoiNgan", tieuDe: "Khi mới vào năm 1, bạn hình dung học ngành BĐS ra trường sẽ làm công việc gì?" },
        { ma: "B2", loai: "chonNhieu", tieuDe: "Hiện tại, bạn biết đến những vị trí nào dành cho người học BĐS?",
          luaChon: DS_VI_TRI },
        { ma: "B3", loai: "thang5", tieuDe: "“Tôi có thể mô tả cụ thể một ngày làm việc của ít nhất 2 vị trí khác ngoài môi giới/kinh doanh.”" },
        { ma: "B4", loai: "chonNhieu", tieuDe: "Bạn đã tìm hiểu về ngành qua những nguồn nào?",
          luaChon: ["Giảng viên trên lớp", "Workshop/talkshow", "Câu lạc bộ", "Anh chị khóa trên", "Người đang đi làm trong ngành",
            "Mạng xã hội", "Báo chí/báo cáo thị trường", "Thực tập/làm thêm", "Khác (ghi rõ)"] },
        // B5 chỉ hiện những nguồn bạn đã chọn ở B4 (nếu bỏ qua B4 thì hiện cả danh sách)
        { ma: "B5", loai: "chon1", tieuDe: "Trong các nguồn trên, nguồn nào giúp bạn hiểu công việc thật nhất?",
          layLuaChonTu: "B4" },
        { ma: "B6", loai: "chon1", tieuDe: "Bạn đã tham gia bao nhiêu workshop/talkshow về ngành BĐS?",
          luaChon: ["0", "1–2", "3–5", "Trên 5"] },
        { ma: "B7", loai: "thang5", tieuDe: "“Sau các workshop đã tham gia, tôi hình dung rõ hơn công việc cụ thể mình có thể làm.”",
          anKhi: { cau: "B6", la: ["0"] } },
        { ma: "B8", loai: "chonNhieu", tieuDe: "Nếu workshop chưa giúp bạn nhiều, lý do là gì?",
          luaChon: ["Nội dung chung chung, nói về thị trường hơn là công việc", "Diễn giả quá xa giai đoạn của mình",
            "Không có cơ hội hỏi", "Chỉ nói mặt tốt của công việc", "Thiếu ví dụ thực tế", "Workshop vẫn hữu ích", "Khác (ghi rõ)"],
          anKhi: { cau: "B6", la: ["0"] } },
        { ma: "B9", loai: "thang5", tieuDe: "“Tôi thường cảm thấy mông lung về hướng đi nghề nghiệp của mình.”" },
        { ma: "B10", loai: "thang5", tieuDe: "“Tôi hay lo mình đang chậm hơn bạn bè cùng khóa.”" },
      ],
    },

    {
      ma: "C",
      ten: "Phần C – Giai đoạn 2: Chọn hướng",
      nhan: "Giai đoạn 2",
      giaiDoan: 2,
      cauHoi: [
        { ma: "C1", loai: "chon1", tieuDe: "Bạn đã có hướng nghề muốn theo chưa?",
          luaChon: ["Đã rõ một hướng", "Đang cân nhắc vài hướng", "Chưa có hướng nào"] },
        { ma: "C2", loai: "traLoiNgan", tieuDe: "Nếu đã có hướng, đó là vị trí nào?",
          anKhi: { cau: "C1", la: ["Chưa có hướng nào"] } },
        { ma: "C3", loai: "chonNhieu", tieuDe: "Hướng đó dựa trên căn cứ gì?",
          luaChon: ["Đã trải nghiệm công việc thật", "Trò chuyện với người đang làm vị trí đó", "Nghe giảng/workshop",
            "Đọc trên mạng", "Cảm nhận cá nhân về tính cách của mình", "Theo bạn bè/gia đình", "Khác (ghi rõ)"],
          anKhi: { cau: "C1", la: ["Chưa có hướng nào"] } },
        { ma: "C4", loai: "thang5", tieuDe: "“Tôi có thể kể ra ít nhất 3 việc cụ thể mà người làm vị trí tôi muốn theo phải làm hằng tuần.”",
          anKhi: { cau: "C1", la: ["Chưa có hướng nào"] } },
        { ma: "C5", loai: "thang5", tieuDe: "“Tôi đã (hoặc sẽ) chọn chuyên ngành dựa trên hiểu biết đầy đủ về công việc sau này.”" },
        // "Chưa từng" không đi chung với các lựa chọn khác: chọn nó sẽ bỏ các lựa chọn còn lại
        { ma: "C6", loai: "chonNhieu", tieuDe: "Bạn đã từng thử công việc thật trong ngành dưới hình thức nào?",
          luaChon: ["Thực tập", "Làm thêm/cộng tác viên", "Dự án của CLB", "Cuộc thi mô phỏng (case)",
            "Đi theo anh chị để quan sát công việc", "Chưa từng"],
          luaChonDuyNhat: ["Chưa từng"] },
        { ma: "C7", loai: "chon1", tieuDe: "Khi cần hỏi về nghề, bạn có người đi trước trong ngành để hỏi không?",
          luaChon: ["Có, và hỏi thường xuyên", "Có, nhưng ngại hỏi", "Không có ai"] },
        { ma: "C9", loai: "chonNhieu", toiDa: 3, tieuDe: "Bạn muốn tìm hiểu kỹ hơn về những vị trí nào?",
          luaChon: DS_VI_TRI },
        { ma: "C10", loai: "chonNhieu", toiDa: 3, tieuDe: "Với vị trí đó, bạn muốn biết điều gì nhất?",
          luaChon: ["Công việc cụ thể hằng ngày", "Kỹ năng và kiến thức cần có", "Cách bắt đầu vào nghề (thực tập, vị trí đầu tiên)",
            "Lộ trình thăng tiến 3–5 năm", "Thu nhập và cách tính thu nhập", "Áp lực, mặt khó của công việc",
            "Cân bằng công việc và cuộc sống", "Ai hợp và ai không hợp với nghề này"] },
        // Mỗi vị trí chọn ở C9 có một ô riêng. Nếu bỏ qua C9 thì hiện một ô chung với tieuDeKhiKhongChon.
        { ma: "C8", loai: "traLoiNgan", moiLuaChonMotO: "C9",
          tieuDe: "Nếu được gặp một anh/chị đang làm vị trí bạn đã chọn, bạn muốn hỏi câu gì?",
          tieuDeKhiKhongChon: "Nếu có một anh/chị đi trước để hỏi, điều đầu tiên bạn muốn hỏi là gì?" },
      ],
    },

    {
      ma: "D",
      ten: "Phần D – Giai đoạn 3: Apply và đi làm",
      nhan: "Giai đoạn 3",
      giaiDoan: 3,
      cauHoi: [
        { ma: "D1", loai: "chon1", tieuDe: "Bạn đã từng apply thực tập hoặc việc làm trong ngành BĐS chưa?",
          luaChon: ["Đã từng", "Chưa từng"] },
        { ma: "D2", loai: "chon1", tieuDe: "Bạn đã apply khoảng bao nhiêu nơi?",
          luaChon: ["1–5", "6–15", "16–30", "Trên 30"],
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D3", loai: "chon1", tieuDe: "Bạn được mời phỏng vấn ở bao nhiêu nơi?",
          luaChon: ["0", "1–2", "3–5", "Trên 5"],
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D4", loai: "chon1", tieuDe: "Bạn nhận được bao nhiêu offer?",
          luaChon: ["0", "1", "2 trở lên"],
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D5", loai: "thang5", tieuDe: "“Trước khi apply, tôi hiểu rõ nhà tuyển dụng đánh giá ứng viên dựa trên những gì.”",
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D6", loai: "thang5", tieuDe: "“Mức độ cạnh tranh khi apply cao hơn nhiều so với tôi hình dung.”",
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D7", loai: "chon1", tieuDe: "Nếu đã thực tập/làm việc, công việc thật so với hình dung ban đầu thế nào?",
          luaChon: ["Gần giống", "Khác một chút", "Khác nhiều", "Chưa từng đi làm"],
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
        { ma: "D8", loai: "traLoiNgan", tieuDe: "Công việc thật khác hình dung của bạn ở điểm nào?",
          chiHienKhi: { cau: "D1", la: ["Đã từng"] },
          anKhi: { cau: "D7", la: ["Gần giống", "Chưa từng đi làm"] } },
        { ma: "D9", loai: "chon1", tieuDe: "Sau trải nghiệm apply/đi làm, bạn đang ở trạng thái nào?",
          luaChon: ["Tiếp tục hướng cũ", "Chuyển sang hướng khác trong ngành BĐS", "Cân nhắc rời ngành", "Chưa biết đi tiếp thế nào"],
          chiHienKhi: { cau: "D1", la: ["Đã từng"] } },
      ],
    },

    {
      ma: "E",
      ten: "Phần E – Ưu tiên và nhu cầu hỗ trợ",
      nhan: "Chặng cuối",
      giaiDoan: 3, // nằm chung đoạn cuối của thanh tiến trình
      cauHoi: [
        { ma: "E1", loai: "chonNhieu", toiDa: 3, tieuDe: "Trong các khó khăn dưới đây, khó khăn nào bạn thấy nặng nhất với mình?",
          luaChon: [
            "Không biết ngành có những nghề gì ngoài sale",
            "Thông tin rời rạc, chủ yếu nghe nói",
            "Mông lung, lo mình chậm hơn bạn bè",
            "Chọn hướng dựa trên hình dung, không chắc đúng",
            "Chọn chuyên ngành khi chưa đủ căn cứ",
            "Chưa được thử việc thật nên chưa biết mình hợp gì",
            "Không có người đi trước dẫn dắt",
            "Cạnh tranh khi apply, không biết nhà tuyển dụng cần gì",
            "Vỡ mộng vì công việc thật khác hình dung",
            "Chới với, mất phương hướng sau khi trượt hoặc vỡ mộng",
            "Ít cơ hội việc làm nếu muốn về quê",
            "Khác (ghi rõ)",
          ] },
        { ma: "E2", loai: "chonNhieu", toiDa: 3, tieuDe: "Hình thức hỗ trợ nào bạn muốn có nhất?",
          luaChon: [
            "Bài mô tả công việc thật của từng vị trí, do người đang làm kể",
            "Trò chuyện nhóm nhỏ với anh chị đi trước",
            "Một anh/chị hướng dẫn 1–1 theo định kỳ",
            "Bài tập mô phỏng công việc thật",
            "Được xem và góp ý CV",
            "Chia sẻ JD và câu hỏi phỏng vấn thật",
            "Lộ trình gợi ý theo từng năm học",
            "Khác (ghi rõ)",
          ] },
        { ma: "E3", loai: "traLoiNgan", tieuDe: "Điều bạn ước được biết sớm hơn về ngành này là gì?" },
        // Email được gửi sang sheet riêng, không nằm chung dòng với câu trả lời
        { ma: "E4", loai: "email", tieuDe: "Nếu muốn nhận nội dung chia sẻ hoặc tham gia các buổi trò chuyện, hãy để lại email.",
          ghiChu: "Không bắt buộc. Email chỉ dùng cho mục đích này và được tách riêng khỏi câu trả lời khi phân tích." },
      ],
    },
  ],

  /* ---------- MÀN HÌNH KẾT QUẢ ---------- */
  ketQua: {
    luuY: "Đây chỉ là gợi ý tham khảo dựa trên câu trả lời của bạn, không phải đánh giá chính xác.",
    giaiDoan: {
      1: {
        ten: "Giai đoạn 1 – Hiểu ngành",
        moDau: "Có vẻ bạn đang ở giai đoạn khám phá ngành. Việc này rất bình thường!",
        goiY: [
          "Chọn 2–3 vị trí ngoài môi giới mà bạn tò mò, rồi tìm đọc một bản mô tả công việc (JD) thật của từng vị trí.",
          "Đi workshop thì chuẩn bị sẵn một câu hỏi: “Một ngày làm việc của anh/chị gồm những gì?”",
          "Hẹn một anh/chị khóa trên đã đi thực tập để nói chuyện 15 phút. Cách này đôi khi giúp bạn rõ hơn nhiều bài đọc.",
        ],
      },
      2: {
        ten: "Giai đoạn 2 – Chọn hướng",
        moDau: "Có vẻ bạn đã bắt đầu có hướng và đang cân nhắc lựa chọn.",
        goiY: [
          "Kiểm chứng hướng bạn chọn bằng cách hỏi một người đang làm vị trí đó: hằng tuần họ thật sự làm gì?",
          "Tìm một cách “thử việc” nhỏ, ví dụ dự án CLB, cuộc thi case hay làm cộng tác viên.",
          "Nếu lý do chọn hướng chủ yếu là “đọc trên mạng” hay “cảm giác”, bạn nên kiểm chứng thêm trước khi chọn chuyên ngành.",
        ],
      },
      3: {
        ten: "Giai đoạn 3 – Apply và đi làm",
        moDau: "Có vẻ bạn đã bước vào giai đoạn apply và trải nghiệm thực tế.",
        goiY: [
          "Sau mỗi lần phỏng vấn, ghi lại các câu được hỏi và chỗ mình trả lời chưa tốt.",
          "Nhờ người đi trước xem CV của bạn, đặt cạnh một JD cụ thể.",
          "Nếu công việc thật khác hình dung, đó là thông tin quý để điều chỉnh hướng, không nhất thiết là thất bại.",
        ],
      },
    },
  },

  /* Quy tắc xếp giai đoạn. "tl" là câu trả lời, ví dụ tl.D1 là đáp án câu D1.
     Câu bị ẩn hoặc bị bỏ qua sẽ không có giá trị. */
  tinhGiaiDoan: function (tl) {
    if (tl.D1 === "Đã từng" || tl.A6 === "Đang thực tập/làm việc" || tl.A6 === "Đã từng") return 3;
    if (tl.C1 === "Đã rõ một hướng" || tl.C1 === "Đang cân nhắc vài hướng" || tl.B3 >= 3) return 2;
    return 1;
  },
};
