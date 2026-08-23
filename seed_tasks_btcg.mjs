import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile('.env.local'); } catch (_) {}
}

const BTCG_PROJECT_ID = '1ZjUVuusk_wD8GnsXXhBthpj8BvyG3fz2';

// Danh sách 32+ công việc chuẩn từ Google Sheet
export const DEFAULT_TASKS_BTCG = [
  {
    stt: 'I',
    isGroup: true,
    title: 'Giai đoạn chuẩn bị Dự án bồi thường hỗ trợ tái định cư',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: '',
    progress_percent: 0,
    start_date: null,
    end_date: null,
    duration_days: '',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '1',
    title: 'Giao nhiệm vụ Chủ đầu tư lập dự án bồi thường hỗ trợ tái định cư và Tách nội dung bồi thường hỗ trợ tái định cư thành dự án độc lập; Cung cấp bản đồ hồ sơ liên quan',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Sở Tài chính, Công ty Vinspeed',
    progress_percent: 100,
    start_date: '2025-12-15',
    end_date: '2026-01-27',
    duration_days: '43',
    legal_basis: 'Điều 5 Quy chế 4490/QĐ-UBND',
    notes: 'Chủ đầu tư gửi 02 bộ hồ sơ cho UBND cấp xã để chuẩn bị xây dựng Kế hoạch thu hồi đất và bàn giao ranh mốc.'
  },
  {
    stt: '2',
    title: 'Thẩm định trình phê duyệt Phương án tuyến công trình vị trí công trình trên tuyến của Dự án',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Sở Quy hoạch - Kiến trúc',
    progress_percent: 70,
    start_date: '2025-12-15',
    end_date: '2026-02-13',
    duration_days: '60',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '3',
    title: 'Phê duyệt Phương án tuyến công trình vị trí công trình trên tuyến của Dự án',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Ủy ban nhân dân Thành phố',
    progress_percent: 0,
    start_date: '2026-02-13',
    end_date: '2026-02-23',
    duration_days: '10',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '4',
    title: 'Rà soát điều chỉnh cục bộ quy hoạch phân khu quy hoạch chi tiết có liên quan',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Ủy ban nhân dân các phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-02-23',
    end_date: '2026-04-09',
    duration_days: '45',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '5',
    title: 'Chuẩn bị quỹ nền căn hộ tái định cư',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Sở Xây dựng',
    progress_percent: 0,
    start_date: '2026-01-03',
    end_date: '2026-04-03',
    duration_days: '90',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '6',
    title: 'Tạm ứng vốn triển khai dự án bồi thường hỗ trợ tái định cư',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'I. Giai đoạn chuẩn bị',
    assigned_to: 'Công ty Vinspeed',
    progress_percent: 0,
    start_date: '2026-01-01',
    end_date: '2026-03-02',
    duration_days: '60',
    legal_basis: '',
    notes: ''
  },
  {
    stt: 'II',
    isGroup: true,
    title: 'Giai đoạn lập thẩm định trình thẩm định phê duyệt dự án bồi thường hỗ trợ tái định cư',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'II. Lập, thẩm định & phê duyệt dự án',
    assigned_to: '',
    progress_percent: 0,
    start_date: null,
    end_date: null,
    duration_days: '',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '7',
    title: 'Phối hợp cung cấp hồ sơ Phương án tuyến công trình vị trí công trình đã được phê duyệt và các tài liệu liên quan',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'II. Lập, thẩm định & phê duyệt dự án',
    assigned_to: 'Công ty Vinspeed',
    progress_percent: 0,
    start_date: '2026-02-23',
    end_date: '2026-03-05',
    duration_days: '10',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '8',
    title: 'Lập dự án bồi thường hỗ trợ tái định cư',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'II. Lập, thẩm định & phê duyệt dự án',
    assigned_to: 'Ban Quản lý đường sắt đô thị',
    progress_percent: 20,
    start_date: '2026-03-05',
    end_date: '2026-04-19',
    duration_days: '45',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '9',
    title: 'Thẩm định trình phê duyệt Dự án bồi thường hỗ trợ tái định cư phục vụ Dự án',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'II. Lập, thẩm định & phê duyệt dự án',
    assigned_to: 'Sở Nông nghiệp và Môi trường',
    progress_percent: 0,
    start_date: '2026-04-19',
    end_date: '2026-05-19',
    duration_days: '30',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '10',
    title: 'Phê duyệt Dự án bồi thường hỗ trợ tái định cư phục vụ Dự án',
    stage: 'Giai đoạn chuẩn bị',
    group_name: 'II. Lập, thẩm định & phê duyệt dự án',
    assigned_to: 'Chủ tịch Ủy ban nhân dân Thành phố',
    progress_percent: 0,
    start_date: '2026-05-19',
    end_date: '2026-05-29',
    duration_days: '10',
    legal_basis: '',
    notes: ''
  },
  {
    stt: 'III',
    isGroup: true,
    title: 'Triển khai công tác bồi thường hỗ trợ tái định cư thu hồi đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: '',
    progress_percent: 0,
    start_date: null,
    end_date: null,
    duration_days: '',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '11',
    title: 'Bàn giao, tiếp nhận ranh mốc, cọc phạm vi giải phóng mặt bằng của dự án',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ban Quản lý dự án đường sắt đô thị, Tổ chức làm nhiệm vụ bồi thường, UBND các phường xã',
    progress_percent: 0,
    start_date: '2026-05-29',
    end_date: '2026-06-08',
    duration_days: '10',
    legal_basis: 'Điều 5 Quy chế 4490/QĐ-UBND',
    notes: 'Tiến hành bàn giao ranh giới mốc giới vị trí khu vực thu hồi đất trên thực địa.'
  },
  {
    stt: '12',
    title: 'Ban hành kế hoạch thu hồi đất, triển khai công tác bồi thường, hỗ trợ tái định cư',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-06-13',
    duration_days: '5',
    legal_basis: 'Điều 6 Quy chế 4490/QĐ-UBND',
    notes: 'Thực hiện trong thời gian không quá 10 ngày kể từ ngày nhận được văn bản kèm hồ sơ do chủ đầu tư gửi đến.'
  },
  {
    stt: '13',
    title: 'Tổ chức họp với người có đất trong khu vực thu hồi',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-07-08',
    duration_days: '30',
    legal_basis: 'Điều 8 Quy chế 4490/QĐ-UBND',
    notes: 'Trong thời gian không quá 07 ngày kể từ ngày phê duyệt Kế hoạch thu hồi đất.'
  },
  {
    stt: '14',
    title: 'Thành lập Hội đồng bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-06-13',
    duration_days: '5',
    legal_basis: 'Điều 4 Quy chế 4490/QĐ-UBND',
    notes: 'Hội đồng do Chủ tịch UBND cấp xã quyết định thành lập đối với từng dự án.'
  },
  {
    stt: '15',
    title: 'Ban hành Thông báo thu hồi đất và gửi thông báo thu hồi đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Chủ tịch UBND các phường xã, UBND các phường xã',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-06-18',
    duration_days: '10',
    legal_basis: 'Điều 9 & Điều 10 Quy chế 4490/QĐ-UBND',
    notes: 'Ban hành trong tối đa 05 ngày kể từ ngày họp dân; Gửi thông báo trong tối đa 05 ngày kể từ ngày ban hành.'
  },
  {
    stt: '16',
    title: 'Tổ chức điều tra, khảo sát, đo đạc, kiểm đếm, thu thập pháp lý nhà, đất và tài sản gắn liền với đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-07-08',
    duration_days: '30',
    legal_basis: 'Điều 11 Quy chế 4490/QĐ-UBND',
    notes: 'Tối đa 25 ngày kể từ ngày ban hành thông báo thu hồi đất (thực hiện song song/kết hợp).'
  },
  {
    stt: '17',
    title: 'Xác định nguồn gốc tình trạng pháp lý nhà đất và tài sản gắn liền với đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-06-15',
    end_date: '2026-07-15',
    duration_days: '30',
    legal_basis: 'Điều 12 Quy chế 4490/QĐ-UBND',
    notes: 'Thời gian không quá 40 ngày kể từ ngày nhận được hồ sơ do đơn vị bồi thường chuyển đến.'
  },
  {
    stt: '18',
    title: 'Ban hành Quyết định biện pháp, mức hỗ trợ khác',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-07-10',
    end_date: '2026-07-20',
    duration_days: '10',
    legal_basis: 'Điều 13 Quy chế 4490/QĐ-UBND & QĐ 11/2026/QĐ-UBND (Điều 3 & Điều 20)',
    notes: 'Áp dụng theo thẩm quyền phân cấp cho Chủ tịch UBND cấp xã/UBND cấp xã theo QĐ 11/2026/QĐ-UBND.'
  },
  {
    stt: '19',
    title: 'Lập dự thảo Phương án bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư',
    progress_percent: 0,
    start_date: '2026-07-20',
    end_date: '2026-08-09',
    duration_days: '20',
    legal_basis: 'Điều 14 Quy chế 4490/QĐ-UBND',
    notes: 'Thời gian không quá 20 ngày kể từ ngày nhận được kết quả xác nhận nguồn gốc pháp lý.'
  },
  {
    stt: '20',
    title: 'Niêm yết công khai dự thảo Phương án bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường; UBND các phường xã',
    progress_percent: 0,
    start_date: '2026-08-09',
    end_date: '2026-08-19',
    duration_days: '10',
    legal_basis: 'Điều 15 Quy chế 4490/QĐ-UBND',
    notes: 'Niêm yết công khai và đăng tải Cổng thông tin điện tử trong thời hạn 10 ngày.'
  },
  {
    stt: '21',
    title: 'Lấy ý kiến dự thảo Phương án bồi thường; Tổ chức đối thoại trong trường hợp có ý kiến không đồng ý',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Ủy ban nhân dân các phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-08-19',
    end_date: '2026-09-08',
    duration_days: '30',
    legal_basis: 'Điều 16 Quy chế 4490/QĐ-UBND',
    notes: 'Tối đa 05 ngày kể từ ngày hết niêm yết để lấy ý kiến; Tổ chức đối thoại trong thời hạn 30 ngày nếu còn ý kiến khác.'
  },
  {
    stt: '22',
    title: 'Thẩm định Phương án bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Cơ quan có chức năng quản lý đất đai cấp xã',
    progress_percent: 0,
    start_date: '2026-09-08',
    end_date: '2026-09-23',
    duration_days: '15',
    legal_basis: 'Điều 17 Quy chế 4490/QĐ-UBND',
    notes: 'Thời gian không quá 30 ngày kể từ ngày nhận đủ hồ sơ hợp lệ.'
  },
  {
    stt: '23',
    title: 'Quyết định phê duyệt Phương án bồi thường, hỗ trợ, tái định cư (bao gồm di dời hạ tầng kỹ thuật)',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Chủ tịch Ủy ban nhân dân các phường xã có dự án',
    progress_percent: 0,
    start_date: '2026-09-23',
    end_date: '2026-09-28',
    duration_days: '5',
    legal_basis: 'Điều 18 Quy chế 4490/QĐ-UBND',
    notes: 'Trong thời gian không quá 03 ngày kể từ ngày hoàn thành thẩm định.'
  },
  {
    stt: '24',
    title: 'Phổ biến, niêm yết công khai quyết định phê duyệt Phương án bồi thường; Gửi phương án bồi thường',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư',
    progress_percent: 0,
    start_date: '2026-09-28',
    end_date: '2026-10-05',
    duration_days: '7',
    legal_basis: 'Điều 19 Quy chế 4490/QĐ-UBND',
    notes: 'Gửi phương án đã duyệt đến từng người có đất thu hồi và niêm yết công khai.'
  },
  {
    stt: '25',
    title: 'Tổ chức chi trả bồi thường, hỗ trợ, tái định cư và tiếp nhận mặt bằng',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư',
    progress_percent: 0,
    start_date: '2026-09-28',
    end_date: '2026-10-13',
    duration_days: '15',
    legal_basis: 'Điều 19 Quy chế 4490/QĐ-UBND & QĐ 11/2026/QĐ-UBND (Điều 14 - Thưởng bàn giao)',
    notes: 'Chi trả trong thời hạn 30 ngày từ khi quyết định phê duyệt có hiệu lực; Thưởng bàn giao trước thời hạn tối đa 50tr/hộ (toàn bộ) hoặc 25tr/hộ (một phần).'
  },
  {
    stt: '26',
    title: 'Ban hành Quyết định thu hồi đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'Chủ tịch Ủy ban nhân dân các phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-09-28',
    end_date: '2026-10-06',
    duration_days: '8',
    legal_basis: 'Điều 21 Quy chế 4490/QĐ-UBND',
    notes: 'Ban hành trong thời hạn 10 ngày kể từ ngày phê duyệt phương án/bàn giao tái định cư/nhận tiền tự lo chỗ ở.'
  },
  {
    stt: '27',
    title: 'Quản lý quỹ đất đã thu hồi và bàn giao cho Nhà đầu tư thực hiện dự án',
    stage: 'Giai đoạn thực hiện',
    group_name: 'III. Triển khai bồi thường & GPMB',
    assigned_to: 'UBND các phường xã, các đơn vị chủ quản HTKT',
    progress_percent: 0,
    start_date: '2026-10-06',
    end_date: '2026-10-21',
    duration_days: '15',
    legal_basis: 'Điều 31 Quy chế 4490/QĐ-UBND',
    notes: 'UBND cấp xã có trách nhiệm quản lý đất đã thu hồi để bàn giao cho chủ đầu tư.'
  },
  {
    stt: 'IV',
    isGroup: true,
    title: 'Áp dụng các biện pháp hành chính thu hồi đất đối với các trường hợp không đồng thuận',
    stage: 'Giai đoạn thực hiện',
    group_name: 'IV. Biện pháp hành chính cưỡng chế',
    assigned_to: '',
    progress_percent: 0,
    start_date: null,
    end_date: null,
    duration_days: '',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '28',
    title: 'Vận động thuyết phục (Trường hợp không đồng thuận phương án bồi thường)',
    stage: 'Giai đoạn thực hiện',
    group_name: 'IV. Biện pháp hành chính cưỡng chế',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-10-06',
    end_date: '2026-10-16',
    duration_days: '10',
    legal_basis: 'Điều 22 Quy chế 4490/QĐ-UBND',
    notes: 'Vận động thuyết phục trong thời gian 10 ngày và lập thành biên bản.'
  },
  {
    stt: '29',
    title: 'Ban hành Quyết định thu hồi đất đối với các trường hợp không đồng thuận',
    stage: 'Giai đoạn thực hiện',
    group_name: 'IV. Biện pháp hành chính cưỡng chế',
    assigned_to: 'Chủ tịch Ủy ban nhân dân các phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-10-16',
    end_date: '2026-10-19',
    duration_days: '3',
    legal_basis: 'Điều 22 khoản 2 Quy chế 4490/QĐ-UBND',
    notes: 'Quá 10 ngày kể từ ngày kết thúc vận động mà vẫn không đồng ý thì Chủ tịch UBND cấp xã ban hành QĐ thu hồi đất.'
  },
  {
    stt: '30',
    title: 'Vận động thuyết phục (Trường hợp không bàn giao mặt bằng)',
    stage: 'Giai đoạn thực hiện',
    group_name: 'IV. Biện pháp hành chính cưỡng chế',
    assigned_to: 'Ủy ban nhân dân các Phường xã có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-10-19',
    end_date: '2026-10-29',
    duration_days: '10',
    legal_basis: 'Điều 23 khoản 1 Quy chế 4490/QĐ-UBND',
    notes: 'Vận động thuyết phục trong thời gian 10 ngày và lập thành biên bản.'
  },
  {
    stt: '31',
    title: 'Thực hiện các biện pháp hành chính cưỡng chế thu hồi đất',
    stage: 'Giai đoạn thực hiện',
    group_name: 'IV. Biện pháp hành chính cưỡng chế',
    assigned_to: 'UBND các phường xã, Tổ chức làm nhiệm vụ bồi thường',
    progress_percent: 0,
    start_date: '2026-10-29',
    end_date: '2026-11-08',
    duration_days: '10',
    legal_basis: 'Điều 23 - Điều 29 Quy chế 4490/QĐ-UBND',
    notes: 'Quá 10 ngày từ khi kết thúc vận động bàn giao đất thì tham mưu ban hành QĐ cưỡng chế; Cưỡng chế thi hành trong 10 ngày từ khi nhận QĐ.'
  },
  {
    stt: 'V',
    isGroup: true,
    title: 'Di dời hạ tầng kỹ thuật bàn giao mặt bằng',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Các đơn vị chủ quản hạ tầng kỹ thuật',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-10-06',
    duration_days: '120',
    legal_basis: 'Điều 20 Quy chế 4490/QĐ-UBND & QĐ 11/2026/QĐ-UBND (Điều 20 khoản 21)',
    notes: 'Hỗ trợ theo giá trị thiệt hại thực tế không vượt quá 100% giá trị xây mới tương đương.'
  },
  {
    stt: '32',
    title: 'Khảo sát hiện trạng & Phân loại công trình HTKT bị ảnh hưởng',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Chủ đầu tư dự án chính; Tổ chức làm nhiệm vụ BTTĐC; Đơn vị chủ quản HTKT; UBND cấp xã',
    progress_percent: 0,
    start_date: '2026-06-08',
    end_date: '2026-06-23',
    duration_days: '15',
    legal_basis: 'Điểm 1.1 & 2.1 CV 6081/SNNMT-BTTĐC; Điều 87 Luật Đất đai 2024; CV 18684/SNNMT-BTTĐC',
    notes: 'Rà soát toàn bộ hệ thống HTKT (điện cấp thoát nước viễn thông chiếu sáng...); Phân loại: (1) Thuộc ranh thu hồi đất hay ngoài ranh dự án nhưng bị ảnh hưởng; (2) Tuyến HTKT thuộc 01 phường/xã hay kéo dài qua 02 phường/xã trở lên.'
  },
  {
    stt: '33',
    title: 'Rà soát tính pháp lý & Cam kết không bồi hoàn',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'UBND cấp xã (Chủ trì); Chủ đầu tư; Đơn vị chủ quản HTKT; Các Sở chuyên ngành',
    progress_percent: 0,
    start_date: '2026-06-15',
    end_date: '2026-06-25',
    duration_days: '10',
    legal_basis: 'Điểm 1.7 CV 6081/SNNMT-BTTĐC; Điểm 1.3 TB 330/TB-VP; CV 11352/SNNMT-BTTĐC; Luật Đường bộ 2024',
    notes: 'Kiểm tra hồ sơ giao đất/cấp phép công trình. Nếu có cam kết tự di dời/không bồi hoàn khi Nhà nước thu hồi đất hoặc mở rộng đường: Đơn vị chủ quản tự di dời bàn giao mặt bằng không được bồi thường. Nếu đủ điều kiện bồi thường/hỗ trợ: Chuyển sang bước lập dự toán chi phí.'
  },
  {
    stt: '34',
    title: 'Lập Phương án di dời & Xác định chi phí Bồi thường Hỗ trợ HTKT',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Chủ đầu tư; Tổ chức làm nhiệm vụ BTTĐC; Đơn vị tư vấn; Đơn vị chủ quản HTKT',
    progress_percent: 0,
    start_date: '2026-06-25',
    end_date: '2026-07-15',
    duration_days: '20',
    legal_basis: 'Điểm 1.4 CV 6081/SNNMT-BTTĐC; Khoản 21 Điều 20 QĐ 11/2026/QĐ-UBND; CV 18684/SNNMT-BTTĐC; CV 12070/SNNMT-BTTĐC',
    notes: 'Phân loại công trình tháo dỡ/di chuyển được hay không tháo dỡ được. Bồi thường/Hỗ trợ chi phí tháo dỡ vận chuyển lắp đặt.'
  },
  {
    stt: '35',
    title: 'Thẩm định Phương án Bồi thường Hỗ trợ di dời HTKT',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Phòng Kinh tế hoặc Phòng Kinh tế Hạ tầng & Đô thị cấp xã (Chủ trì); Các cơ quan chuyên môn liên quan',
    progress_percent: 0,
    start_date: '2026-07-15',
    end_date: '2026-08-14',
    duration_days: '30',
    legal_basis: 'Điểm 1.5 CV 6081/SNNMT-BTTĐC; CV 18684/SNNMT-BTTĐC; CV 11352/SNNMT-BTTĐC; Nghị định 151/2025/NĐ-CP',
    notes: 'Cơ quan quản lý đất đai cấp xã thẩm định Phương án BTTĐC (bao gồm nội dung di dời HTKT) trình Chủ tịch UBND cấp xã.'
  },
  {
    stt: '36',
    title: 'Phê duyệt Phương án Bồi thường Hỗ trợ di dời HTKT',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Chủ tịch Ủy ban nhân dân cấp xã nơi có dự án đi qua',
    progress_percent: 0,
    start_date: '2026-08-14',
    end_date: '2026-08-17',
    duration_days: '3',
    legal_basis: 'Điều 18 Quy chế 4490/QĐ-UBND; Điểm 1.5 CV 6081/SNNMT-BTTĐC; CV 2535/UBND-ĐT',
    notes: 'Chủ tịch UBND cấp xã ký Quyết định phê duyệt Phương án bồi thường hỗ trợ tái định cư.'
  },
  {
    stt: '37',
    title: 'Chi trả tiền bồi thường / hỗ trợ di dời HTKT',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Tổ chức làm nhiệm vụ BTTĐC; Chủ đầu tư dự án chính; Đơn vị chủ quản HTKT',
    progress_percent: 0,
    start_date: '2026-08-17',
    end_date: '2026-09-16',
    duration_days: '30',
    legal_basis: 'Điều 19 Quy chế 4490/QĐ-UBND; Điểm 1.5 CV 6081/SNNMT-BTTĐC; Khoản 1 Điều 94 Luật Đất đai 2024',
    notes: 'Chủ đầu tư cung cấp nguồn kinh phí. Tổ chức làm nhiệm vụ BTTĐC chi trả tiền bồi thường/hỗ trợ 1 lần cho Đơn vị chủ quản.'
  },
  {
    stt: '38',
    title: 'Thi công di dời HTKT',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Đơn vị chủ quản HTKT / Nhà thầu di dời; Chủ đầu tư; UBND cấp xã',
    progress_percent: 0,
    start_date: '2026-09-16',
    end_date: '2026-10-16',
    duration_days: '30',
    legal_basis: 'Điểm 1.6 & 2.1 CV 6081/SNNMT-BTTĐC; Điểm 1.3 TB 330/TB-VP',
    notes: 'Đơn vị chủ quản triển khai thi công tháo dỡ di dời đấu nối hệ thống mới bảo đảm an toàn liên tục cho hạ tầng kỹ thuật đô thị.'
  },
  {
    stt: '39',
    title: 'Quản lý & Điều chỉnh hồ sơ tài sản sau di dời',
    stage: 'Giai đoạn thực hiện',
    group_name: 'V. Di dời hạ tầng kỹ thuật',
    assigned_to: 'Đơn vị chủ quản HTKT; Cơ quan Quản lý Tài chính / Tài sản công',
    progress_percent: 0,
    start_date: '2026-10-16',
    end_date: '2026-11-15',
    duration_days: '30',
    legal_basis: 'Điểm 1.6 CV 6081/SNNMT-BTTĐC; Luật Quản lý sử dụng tài sản công',
    notes: 'Đơn vị chủ quản HTKT lập thủ tục ghi tăng/giảm điều chỉnh tài sản công hoặc tài sản doanh nghiệp theo quy định.'
  },
  {
    stt: 'VI',
    isGroup: true,
    title: 'Giai đoạn kết thúc dự án',
    stage: 'Giai đoạn kết thúc',
    group_name: 'VI. Kết thúc dự án',
    assigned_to: '',
    progress_percent: 0,
    start_date: null,
    end_date: null,
    duration_days: '',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '40',
    title: 'Bàn giao mặt bằng sạch',
    stage: 'Giai đoạn kết thúc',
    group_name: 'VI. Kết thúc dự án',
    assigned_to: 'Đơn vị chủ quản HTKT bàn giao cho Chủ đầu tư dự án chính; UBND cấp xã giám sát',
    progress_percent: 0,
    start_date: '2026-10-16',
    end_date: '2026-10-26',
    duration_days: '10',
    legal_basis: 'Điểm 1.7 CV 6081/SNNMT-BTTĐC; Điều 31 Quy chế 4490/QĐ-UBND',
    notes: 'Lập biên bản nghiệm thu hoàn thành di dời HTKT và biên bản bàn giao mặt bằng sạch trên thực địa cho Chủ đầu tư dự án chính.'
  },
  {
    stt: '41',
    title: 'Quyết toán chi phí bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn kết thúc',
    group_name: 'VI. Kết thúc dự án',
    assigned_to: 'Chủ đầu tư, Tổ chức làm nhiệm vụ bồi thường, Sở Tài chính',
    progress_percent: 0,
    start_date: '2026-10-26',
    end_date: '2026-12-25',
    duration_days: '60',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '42',
    title: 'Lập và bàn giao hồ sơ lưu trữ',
    stage: 'Giai đoạn kết thúc',
    group_name: 'VI. Kết thúc dự án',
    assigned_to: 'Tổ chức làm nhiệm vụ bồi thường, UBND cấp xã',
    progress_percent: 0,
    start_date: '2026-11-25',
    end_date: '2026-12-25',
    duration_days: '30',
    legal_basis: '',
    notes: ''
  },
  {
    stt: '43',
    title: 'Báo cáo hoàn thành công tác bồi thường, hỗ trợ, tái định cư',
    stage: 'Giai đoạn kết thúc',
    group_name: 'VI. Kết thúc dự án',
    assigned_to: 'Chủ đầu tư, UBND Thành phố',
    progress_percent: 0,
    start_date: '2026-12-15',
    end_date: '2026-12-31',
    duration_days: '16',
    legal_basis: '',
    notes: ''
  }
];

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to DB for seeding tasks.');

  // Xóa toàn bộ dữ liệu tasks cũ
  await client.query('DELETE FROM task_documents');
  await client.query('DELETE FROM tasks');
  console.log('Cleared old mock tasks and task_documents.');

  let order = 0;
  for (const t of DEFAULT_TASKS_BTCG) {
    order++;
    const taskId = `task-btcg-${order.toString().padStart(2, '0')}`;
    await client.query(`
      INSERT INTO tasks (
        id, project_id, stt, title, group_name, stage, assigned_to,
        progress_percent, start_date, end_date, duration_days,
        legal_basis, notes, order_index, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      taskId,
      BTCG_PROJECT_ID,
      t.stt,
      t.title,
      t.group_name || '',
      t.stage || '',
      t.assigned_to || '',
      t.progress_percent || 0,
      t.start_date || null,
      t.end_date || null,
      t.duration_days || '',
      t.legal_basis || '',
      t.notes || '',
      order,
      t.progress_percent === 100 ? 'completed' : (t.progress_percent > 0 ? 'processing' : 'pending')
    ]);
  }

  // Cập nhật db.json cục bộ
  try {
    const dbPath = path.join(process.cwd(), 'src', 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      dbData.tasks = DEFAULT_TASKS_BTCG.map((t, idx) => ({
        id: `task-btcg-${(idx + 1).toString().padStart(2, '0')}`,
        project_id: BTCG_PROJECT_ID,
        ...t,
        order_index: idx + 1,
        documents: []
      }));
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf-8');
      console.log('Updated db.json with seeded tasks.');
    }
  } catch (err) {
    console.error('Error updating db.json:', err);
  }

  console.log(`Seeded ${DEFAULT_TASKS_BTCG.length} tasks successfully.`);
  await client.end();
}

if (process.argv[1].endsWith('seed_tasks_btcg.mjs')) {
  seed().catch(console.error);
}
