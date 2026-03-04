import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Project } from "@/features/projects";
import ProjectCard from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";

interface ProjectGridProps {
  projects: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onView?: (project: Project) => void;
  loading?: boolean;
  className?: string;
}

export default function ProjectGrid({
  projects,
  pagination,
  onPageChange,
  onView,
  loading = false,
  className,
}: ProjectGridProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200/60'} shadow-lg overflow-hidden`}
          >
            <div className={`${isDark ? 'h-48 bg-gradient-to-br from-slate-600 to-slate-700' : 'h-48 bg-gradient-to-br from-gray-100 to-gray-200'} animate-pulse`} />
            <div className="p-6 space-y-4">
              <div className={`${isDark ? 'h-7 w-3/4 bg-slate-600' : 'h-7 w-3/4 bg-gray-200'} rounded-xl animate-pulse"`} />
              <div className={`${isDark ? 'h-4 w-full bg-slate-600' : 'h-4 w-full bg-gray-100'} rounded-lg animate-pulse"`} />
              <div className={`${isDark ? 'h-4 w-5/6 bg-slate-600' : 'h-4 w-5/6 bg-gray-100'} rounded-lg animate-pulse"`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 ${className} ${isDark ? 'text-white' : ''}`}>
        <div className="text-center">
          <div className={`mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl ${isDark ? 'bg-gradient-to-br from-indigo-900 to-purple-900' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} shadow-2xl`}>
            <FolderOpen className="h-12 w-12 text-white" />
          </div>
          <h3 className={`mb-3 text-3xl font-bold bg-gradient-to-r ${isDark ? 'from-gray-200 to-gray-400' : 'from-gray-800 to-gray-600'} bg-clip-text text-transparent`}>
            No projects found
          </h3>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-500'} max-w-md mx-auto`}>
            Try adjusting your search or filter criteria to find what you're looking for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} ${isDark ? 'text-white' : ''}`}>
      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
          >
            <div className={`rounded-2xl overflow-hidden border ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'} shadow-md group-hover:shadow-xl transition-shadow`}>
              <ProjectCard project={project} onView={onView} />
            </div>
          </div>
        ))}
      </div>

      {/* Premium Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-6 pt-8">
          <p className="text-sm text-gray-600 font-medium">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-bold text-gray-900">{pagination.total}</span> results
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 1
              )
              .map((pageNum, index, array) => {
                const showEllipsis = index > 0 && pageNum - array[index - 1] > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && <span className="px-3 text-gray-400">...</span>}
                    <Button
                      variant={pageNum === pagination.page ? "default" : "outline"}
                      size="lg"
                      onClick={() => onPageChange?.(pageNum)}
                      className={
                        pageNum === pagination.page
                          ? "min-w-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                          : "min-w-12 rounded-xl"
                      }
                    >
                      {pageNum}
                    </Button>
                  </React.Fragment>
                );
              })}

            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}