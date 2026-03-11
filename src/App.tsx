import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Download, 
  LogOut, 
  Search,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  User,
  GraduationCap,
  ChevronRight,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Types
type Role = 'student' | 'faculty' | 'employer' | 'admin';

interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  department?: string;
}

interface Internship {
  id: number;
  title: string;
  company: string;
  description: string;
  requirements: string;
  location: string;
  stipend: string;
  duration: string;
  deadline: string;
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  posted_by: number;
  posted_by_name: string;
  created_at: string;
}

interface Application {
  id: number;
  internship_id: number;
  student_id: number;
  status: 'applied' | 'reviewing' | 'shortlisted' | 'accepted' | 'rejected';
  resume_url: string;
  cover_letter: string;
  applied_at: string;
  student_name?: string;
  student_email?: string;
  usn?: string;
  student_id_val?: string;
  semester?: number;
  course?: string;
  internship_title?: string;
  company_name?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'browse' | 'my-applications' | 'post-internship' | 'manage-internships' | 'all-applications'>('login');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterUSN, setFilterUSN] = useState('');
  const [filterStudentID, setFilterStudentID] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInternshipStatus, setFilterInternshipStatus] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
  const [isBulkMailModalOpen, setIsBulkMailModalOpen] = useState(false);
  const [bulkMailSubject, setBulkMailSubject] = useState('');
  const [bulkMailBody, setBulkMailBody] = useState('');
  const [aiDraft, setAiDraft] = useState<{ id: number; text: string } | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('itrack_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchInternships();
      fetchApplications();
    }
  }, [user, view]);

  const fetchInternships = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/internships?role=${user.role}&userId=${user.id}`);
      const data = await res.json();
      setInternships(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/applications?role=${user.role}&userId=${user.id}`);
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAppSelection = (id: number) => {
    setSelectedAppIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = (filteredApps: any[]) => {
    if (selectedAppIds.length === filteredApps.length && filteredApps.length > 0) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApps.map(a => a.id));
    }
  };

  const handleSendBulkMail = () => {
    if (selectedAppIds.length === 0) return;
    setIsBulkMailModalOpen(true);
    
    setBulkMailSubject(`Update regarding your internship application`);
    setBulkMailBody(`Dear Students,\n\nWe are writing to update you on your progress...\n\nBest regards,\nCareer Office`);
  };

  const generateBulkAIDraft = async () => {
    if (selectedAppIds.length === 0) return;
    setIsDrafting(true);
    try {
      const selectedApps = applications.filter(a => selectedAppIds.includes(a.id));
      const context = selectedApps.map(a => `- ${a.student_name} (${a.status}) for ${a.internship_title} at ${a.company_name}`).join('\n');
      
      const prompt = `Draft a professional bulk email for the following students regarding their internship progress:\n${context}\n\nThe tone should be professional and encouraging.`;
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      if (response.text) {
        setBulkMailBody(response.text);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI draft');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('itrack_user', JSON.stringify(data));
        setView('dashboard');
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('itrack_user');
    setView('login');
  };

  const handleApply = async (internshipId: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internship_id: internshipId,
          student_id: user.id,
          resume_url: 'https://example.com/resume.pdf',
          cover_letter: 'I am very interested in this role.'
        })
      });
      if (res.ok) {
        alert('Application submitted successfully!');
        fetchApplications();
      }
    } catch (err) {
      alert('Application failed');
    }
  };

  const updateInternshipStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/internships/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchInternships();
    } catch (err) {
      console.error(err);
    }
  };

  const updateApplicationStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const exportData = (type: 'internships' | 'applications') => {
    window.open(`/api/export/${type}`, '_blank');
  };

  const generateAIDraft = async (app: Application) => {
    setIsDrafting(true);
    try {
      const res = await fetch('/api/ai/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: app.student_name,
          internshipTitle: app.internship_title,
          companyName: app.company_name,
          status: app.status,
          tone: 'professional and informative'
        })
      });
      const data = await res.json();
      setAiDraft({ id: app.id, text: data.draft });
    } catch (err) {
      alert('Failed to generate AI draft');
    } finally {
      setIsDrafting(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Briefcase className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-[#141414] tracking-tight">iTrack</h1>
            <p className="text-[#5A5A40]/60 font-medium">RV University Internship Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-1 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                placeholder="e.g. student@rvu.edu.in"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A40] mb-1 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-black/5 text-center">
            <p className="text-sm text-[#5A5A40]/60">
              Demo Credentials:<br/>
              Admin: admin@rvu.edu.in / admin123<br/>
              Student: student@rvu.edu.in / student123
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-[#5A5A40] text-white shadow-md shadow-[#5A5A40]/20" 
          : "text-[#5A5A40]/70 hover:bg-black/5"
      )}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-black/5 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center">
            <Briefcase className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-[#141414]">iTrack</h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">RV University</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
          />
          
          {user?.role === 'student' && (
            <>
              <SidebarItem 
                icon={Search} 
                label="Browse Internships" 
                active={view === 'browse'} 
                onClick={() => setView('browse')} 
              />
              <SidebarItem 
                icon={ClipboardList} 
                label="My Applications" 
                active={view === 'my-applications'} 
                onClick={() => setView('my-applications')} 
              />
            </>
          )}

          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <>
              <SidebarItem 
                icon={CheckCircle} 
                label="Manage Internships" 
                active={view === 'manage-internships'} 
                onClick={() => setView('manage-internships')} 
              />
              <SidebarItem 
                icon={Users} 
                label="All Applications" 
                active={view === 'all-applications'} 
                onClick={() => setView('all-applications')} 
              />
            </>
          )}

          {user?.role === 'employer' && (
            <>
              <SidebarItem 
                icon={Plus} 
                label="Post Internship" 
                active={view === 'post-internship'} 
                onClick={() => setView('post-internship')} 
              />
              <SidebarItem 
                icon={ClipboardList} 
                label="My Postings" 
                active={view === 'manage-internships'} 
                onClick={() => setView('manage-internships')} 
              />
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-black/5">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 bg-[#E4E3E0] rounded-full flex items-center justify-center text-[#5A5A40] font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-[#5A5A40]/60 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#141414] tracking-tight">
              {view === 'dashboard' && `Welcome back, ${user?.name.split(' ')[0]}`}
              {view === 'browse' && 'Available Internships'}
              {view === 'my-applications' && 'Your Applications'}
              {view === 'post-internship' && 'Post New Internship'}
              {view === 'manage-internships' && 'Manage Internships'}
              {view === 'all-applications' && 'Student Applications'}
            </h1>
            <p className="text-[#5A5A40]/60 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <div className="flex gap-3">
              <button 
                onClick={() => exportData('internships')}
                className="flex items-center gap-2 bg-white border border-black/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-black/5 transition-all"
              >
                <Download size={16} />
                Export Internships
              </button>
              <button 
                onClick={() => exportData('applications')}
                className="flex items-center gap-2 bg-white border border-black/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-black/5 transition-all"
              >
                <Download size={16} />
                Export Applications
              </button>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Briefcase size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[#5A5A40]/60 uppercase tracking-wider">Active Internships</h3>
                  <p className="text-4xl font-bold text-[#141414] mt-1">{internships.filter(i => i.status === 'approved').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[#5A5A40]/60 uppercase tracking-wider">Total Applications</h3>
                  <p className="text-4xl font-bold text-[#141414] mt-1">{applications.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[#5A5A40]/60 uppercase tracking-wider">Partner Companies</h3>
                  <p className="text-4xl font-bold text-[#141414] mt-1">{new Set(internships.map(i => i.company)).size}</p>
                </div>

                {/* Recent Activity / Quick Links */}
                <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-[#5A5A40]" />
                    Recent Opportunities
                  </h2>
                  <div className="space-y-4">
                    {internships.slice(0, 3).map(internship => (
                      <div key={internship.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 hover:bg-black/5 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#F5F5F0] rounded-xl flex items-center justify-center text-[#5A5A40]">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#141414]">{internship.title}</h4>
                            <p className="text-sm text-[#5A5A40]/60">{internship.company} • {internship.location}</p>
                          </div>
                        </div>
                        <ChevronRight className="text-[#5A5A40]/40" />
                      </div>
                    ))}
                    {internships.length === 0 && <p className="text-center py-8 text-[#5A5A40]/40">No internships found.</p>}
                  </div>
                  <button 
                    onClick={() => setView(user?.role === 'student' ? 'browse' : 'manage-internships')}
                    className="w-full mt-6 py-3 rounded-xl border border-black/10 font-bold text-[#5A5A40] hover:bg-black/5 transition-all"
                  >
                    View All
                  </button>
                </div>

                <div className="bg-[#5A5A40] p-8 rounded-3xl text-white shadow-xl shadow-[#5A5A40]/20">
                  <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    {user?.role === 'student' ? (
                      <>
                        <button onClick={() => setView('browse')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-left px-4 flex items-center gap-3 transition-all">
                          <Search size={18} /> Browse Jobs
                        </button>
                        <button onClick={() => setView('my-applications')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-left px-4 flex items-center gap-3 transition-all">
                          <ClipboardList size={18} /> My Applications
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setView('post-internship')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-left px-4 flex items-center gap-3 transition-all">
                          <Plus size={18} /> Post Internship
                        </button>
                        <button onClick={() => setView('all-applications')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-left px-4 flex items-center gap-3 transition-all">
                          <Users size={18} /> Review Students
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Academic Support</p>
                    <p className="text-sm leading-relaxed text-white/80">Need help with your internship credits? Contact the Career Office at support@rvu.edu.in</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'browse' && (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A40]/40" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by title, company, or location..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {internships
                    .filter(i => i.status === 'approved' && (i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.company.toLowerCase().includes(searchTerm.toLowerCase())))
                    .map(internship => (
                      <div key={internship.id} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#5A5A40]">
                              <Building2 size={28} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-[#141414]">{internship.title}</h3>
                              <p className="text-[#5A5A40] font-medium">{internship.company}</p>
                            </div>
                          </div>
                          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {internship.stipend}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center gap-2 text-sm text-[#5A5A40]/70">
                            <MapPin size={16} />
                            <span>{internship.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#5A5A40]/70">
                            <Clock size={16} />
                            <span>{internship.duration}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#5A5A40]/70">
                            <Calendar size={16} />
                            <span>Deadline: {new Date(internship.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mb-6">
                          <p className="text-sm text-[#5A5A40]/80 line-clamp-3 leading-relaxed">
                            {internship.description}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleApply(internship.id)}
                            disabled={applications.some(a => a.internship_id === internship.id)}
                            className={cn(
                              "flex-1 py-3 rounded-xl font-bold transition-all",
                              applications.some(a => a.internship_id === internship.id)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-[#5A5A40] text-white hover:bg-[#4A4A30] shadow-lg shadow-[#5A5A40]/10"
                            )}
                          >
                            {applications.some(a => a.internship_id === internship.id) ? 'Applied' : 'Apply Now'}
                          </button>
                          <button className="px-4 py-3 rounded-xl border border-black/10 text-[#5A5A40] hover:bg-black/5 transition-all">
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {view === 'my-applications' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
                  <div className="flex-1 max-w-xs space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Filter by Status</label>
                    <select 
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="applied">Applied</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F5F5F0]">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Internship</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Company</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Applied Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {applications
                        .filter(app => !filterStatus || app.status === filterStatus)
                        .map(app => (
                        <tr key={app.id} className="hover:bg-black/[0.02] transition-all">
                        <td className="px-6 py-4 font-bold text-[#141414]">{app.internship_title}</td>
                        <td className="px-6 py-4 text-[#5A5A40]">{app.company_name}</td>
                        <td className="px-6 py-4 text-[#5A5A40]/60">{new Date(app.applied_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            app.status === 'accepted' ? "bg-green-100 text-green-700" :
                            app.status === 'rejected' ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[#5A5A40]/40">You haven't applied to any internships yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

            {view === 'manage-internships' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
                  <div className="flex-1 max-w-xs space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Filter by Status</label>
                    <select 
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
                      value={filterInternshipStatus}
                      onChange={(e) => setFilterInternshipStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F5F5F0]">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Internship</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Company</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Posted By</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {internships
                        .filter(i => !filterInternshipStatus || i.status === filterInternshipStatus)
                        .map(internship => (
                        <tr key={internship.id} className="hover:bg-black/[0.02] transition-all">
                        <td className="px-6 py-4 font-bold text-[#141414]">{internship.title}</td>
                        <td className="px-6 py-4 text-[#5A5A40]">{internship.company}</td>
                        <td className="px-6 py-4 text-[#5A5A40]/60">{internship.posted_by_name}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            internship.status === 'approved' ? "bg-green-100 text-green-700" :
                            internship.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {internship.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {internship.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => updateInternshipStatus(internship.id, 'approved')}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button 
                                  onClick={() => updateInternshipStatus(internship.id, 'rejected')}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            <button className="p-2 text-[#5A5A40] hover:bg-black/5 rounded-lg transition-all">
                              <FileText size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

            {view === 'all-applications' && (
              <div className="space-y-6">
                {/* Bulk Actions Bar */}
                {selectedAppIds.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#5A5A40] text-white p-4 rounded-2xl shadow-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-sm">{selectedAppIds.length} students selected</span>
                      <div className="h-4 w-px bg-white/20" />
                      <button 
                        onClick={() => setSelectedAppIds([])}
                        className="text-xs font-medium hover:underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <button 
                      onClick={handleSendBulkMail}
                      className="bg-white text-[#5A5A40] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#F5F5F0] transition-all flex items-center gap-2"
                    >
                      <Mail size={14} />
                      Compose Bulk Email
                    </button>
                  </motion.div>
                )}

                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Semester</label>
                    <select 
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={filterSemester}
                      onChange={(e) => setFilterSemester(e.target.value)}
                    >
                      <option value="">All Semesters</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Status</label>
                    <select 
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="applied">Applied</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Course</label>
                    <input 
                      type="text" 
                      placeholder="Filter by Course..."
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">USN</label>
                    <input 
                      type="text" 
                      placeholder="Filter by USN..."
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={filterUSN}
                      onChange={(e) => setFilterUSN(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">Student ID</label>
                    <input 
                      type="text" 
                      placeholder="Filter by ID..."
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={filterStudentID}
                      onChange={(e) => setFilterStudentID(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-[#F5F5F0]">
                        <th className="px-6 py-4 w-10">
                          <input 
                            type="checkbox" 
                            className="rounded border-black/10 text-[#5A5A40] focus:ring-[#5A5A40]"
                            checked={selectedAppIds.length > 0 && selectedAppIds.length === applications.filter(app => {
                              const matchesSemester = !filterSemester || app.semester?.toString() === filterSemester;
                              const matchesCourse = !filterCourse || app.course?.toLowerCase().includes(filterCourse.toLowerCase());
                              const matchesUSN = !filterUSN || app.usn?.toLowerCase().includes(filterUSN.toLowerCase());
                              const matchesID = !filterStudentID || app.student_id_val?.toLowerCase().includes(filterStudentID.toLowerCase());
                              const matchesStatus = !filterStatus || app.status === filterStatus;
                              return matchesSemester && matchesCourse && matchesUSN && matchesID && matchesStatus;
                            }).length}
                            onChange={() => {
                              const filtered = applications.filter(app => {
                                const matchesSemester = !filterSemester || app.semester?.toString() === filterSemester;
                                const matchesCourse = !filterCourse || app.course?.toLowerCase().includes(filterCourse.toLowerCase());
                                const matchesUSN = !filterUSN || app.usn?.toLowerCase().includes(filterUSN.toLowerCase());
                                const matchesID = !filterStudentID || app.student_id_val?.toLowerCase().includes(filterStudentID.toLowerCase());
                                const matchesStatus = !filterStatus || app.status === filterStatus;
                                return matchesSemester && matchesCourse && matchesUSN && matchesID && matchesStatus;
                              });
                              toggleAllSelection(filtered);
                            }}
                          />
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Student Info</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Academic Details</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Internship</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {applications
                        .filter(app => {
                          const matchesSemester = !filterSemester || app.semester?.toString() === filterSemester;
                          const matchesCourse = !filterCourse || app.course?.toLowerCase().includes(filterCourse.toLowerCase());
                          const matchesUSN = !filterUSN || app.usn?.toLowerCase().includes(filterUSN.toLowerCase());
                          const matchesID = !filterStudentID || app.student_id_val?.toLowerCase().includes(filterStudentID.toLowerCase());
                          const matchesStatus = !filterStatus || app.status === filterStatus;
                          return matchesSemester && matchesCourse && matchesUSN && matchesID && matchesStatus;
                        })
                        .map(app => (
                        <React.Fragment key={app.id}>
                          <tr className={cn(
                            "hover:bg-black/[0.02] transition-all",
                            selectedAppIds.includes(app.id) && "bg-[#5A5A40]/5"
                          )}>
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                className="rounded border-black/10 text-[#5A5A40] focus:ring-[#5A5A40]"
                                checked={selectedAppIds.includes(app.id)}
                                onChange={() => toggleAppSelection(app.id)}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-[#141414]">{app.student_name}</div>
                              <div className="text-xs text-[#5A5A40]/60">{app.student_email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-[#141414]">{app.course}</div>
                              <div className="text-xs text-[#5A5A40]/60">Sem {app.semester} • USN: {app.usn}</div>
                              <div className="text-[10px] text-[#5A5A40]/40">ID: {app.student_id_val}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-[#141414]">{app.internship_title}</div>
                              <div className="text-xs text-[#5A5A40]/60">{app.company_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                app.status === 'accepted' ? "bg-green-100 text-green-700" :
                                app.status === 'rejected' ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {app.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 items-center">
                                <select 
                                  className="text-xs border border-black/10 rounded-lg px-2 py-1 focus:outline-none bg-white"
                                  value={app.status}
                                  onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                >
                                  <option value="applied">Applied</option>
                                  <option value="reviewing">Reviewing</option>
                                  <option value="shortlisted">Shortlisted</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                <button 
                                  onClick={() => generateAIDraft(app)}
                                  disabled={isDrafting}
                                  className="p-2 text-[#5A5A40] hover:bg-black/5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                                  title="AI Email Draft"
                                >
                                  <motion.div
                                    animate={isDrafting ? { rotate: 360 } : {}}
                                    transition={isDrafting ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                                  >
                                    <Clock size={16} />
                                  </motion.div>
                                  AI Draft
                                </button>
                              </div>
                            </td>
                          </tr>
                          {aiDraft?.id === app.id && (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 bg-[#F5F5F0]/50">
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="bg-white p-6 rounded-2xl border border-[#5A5A40]/20 shadow-inner"
                                >
                                  <div className="flex justify-between items-center mb-4">
                                    <h5 className="text-sm font-bold text-[#5A5A40] flex items-center gap-2">
                                      <Briefcase size={16} />
                                      AI Generated Email Draft
                                    </h5>
                                    <button 
                                      onClick={() => setAiDraft(null)}
                                      className="text-xs font-bold text-red-500 hover:underline"
                                    >
                                      Close
                                    </button>
                                  </div>
                                  <div className="bg-[#F5F5F0] p-4 rounded-xl text-sm text-[#141414] whitespace-pre-wrap font-mono leading-relaxed border border-black/5">
                                    {aiDraft.text}
                                  </div>
                                  <div className="mt-4 flex gap-3">
                                    <button 
                                      onClick={() => {
                                        alert('Email "sent" to ' + app.student_email);
                                        setAiDraft(null);
                                      }}
                                      className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#4A4A30] transition-all"
                                    >
                                      Send Email
                                    </button>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(aiDraft.text);
                                        alert('Copied to clipboard');
                                      }}
                                      className="border border-black/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-all"
                                    >
                                      Copy Draft
                                    </button>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'post-internship' && (
              <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm max-w-2xl mx-auto">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = Object.fromEntries(formData.entries());
                  try {
                    const res = await fetch('/api/internships', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...data, posted_by: user?.id, role: user?.role })
                    });
                    if (res.ok) {
                      alert('Internship posted successfully!');
                      setView('dashboard');
                    }
                  } catch (err) {
                    alert('Failed to post internship');
                  }
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Job Title</label>
                      <input name="title" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" placeholder="e.g. Software Engineering Intern" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Company Name</label>
                      <input name="company" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" placeholder="e.g. Google" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Description</label>
                    <textarea name="description" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20 h-32" placeholder="Describe the role and responsibilities..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Location</label>
                      <input name="location" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" placeholder="Bangalore / Remote" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Stipend</label>
                      <input name="stipend" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" placeholder="₹20,000 / Month" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Duration</label>
                      <input name="duration" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" placeholder="3 Months" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Application Deadline</label>
                    <input name="deadline" type="date" required className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20" />
                  </div>

                  <button type="submit" className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20">
                    Post Internship Opportunity
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bulk Mail Modal */}
        <AnimatePresence>
          {isBulkMailModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBulkMailModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#F5F5F0]">
                  <h3 className="text-xl font-bold text-[#141414] flex items-center gap-2">
                    <Mail className="text-[#5A5A40]" />
                    Compose Bulk Email
                  </h3>
                  <button 
                    onClick={() => setIsBulkMailModalOpen(false)}
                    className="p-2 hover:bg-black/5 rounded-full transition-all"
                  >
                    <XCircle size={24} className="text-[#5A5A40]/40" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Recipients</p>
                    <p className="text-sm text-blue-900 font-medium">
                      {applications.filter(a => selectedAppIds.includes(a.id)).map(a => a.student_name).join(', ')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Subject</label>
                    <input 
                      value={bulkMailSubject}
                      onChange={(e) => setBulkMailSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20"
                      placeholder="Email Subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60">Message Body</label>
                      <button 
                        onClick={generateBulkAIDraft}
                        disabled={isDrafting}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-1"
                      >
                        <motion.div
                          animate={isDrafting ? { rotate: 360 } : {}}
                          transition={isDrafting ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                        >
                          <Clock size={12} />
                        </motion.div>
                        {isDrafting ? 'Generating...' : 'Use AI to Draft'}
                      </button>
                    </div>
                    <textarea 
                      value={bulkMailBody}
                      onChange={(e) => setBulkMailBody(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-[#5A5A40]/20 h-48 resize-none"
                      placeholder="Write your message here..."
                    />
                  </div>
                </div>

                <div className="p-6 bg-[#F5F5F0] border-t border-black/5 flex gap-3">
                  <button 
                    onClick={() => {
                      alert(`Emails "sent" to ${selectedAppIds.length} students.`);
                      setIsBulkMailModalOpen(false);
                      setSelectedAppIds([]);
                    }}
                    className="flex-1 bg-[#5A5A40] text-white py-3 rounded-xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
                  >
                    Send Emails
                  </button>
                  <button 
                    onClick={() => setIsBulkMailModalOpen(false)}
                    className="px-6 py-3 rounded-xl border border-black/10 font-bold text-[#5A5A40] hover:bg-black/5 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
